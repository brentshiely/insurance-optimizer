#!/usr/bin/env python3
"""Serve a folder as static files and apply the rules of its Cloudflare Pages `_headers` file.

Why: `npm run preview` (python -m http.server) sends no custom headers, so the Content-Security-Policy in
public/_headers would never be exercised locally. This server sends the same headers Cloudflare Pages would, so
the whole wizard can be checked under the real policy (Story S15). It changes nothing about `npm run preview`.

Usage:
    python3 scripts/serve.py [DIRECTORY] [--port N] [--bind ADDRESS] [--headers FILE]
    python3 scripts/serve.py public --check /index.html     # print the headers a request would get, then exit
    python3 scripts/serve.py --self-test                    # check the rule parser and matcher, then exit

DIRECTORY defaults to the repo's `public` folder, wherever you run this from. The rules come from `DIRECTORY/_headers` unless --headers names another file.
Like Cloudflare, the server does not serve `_headers` itself (it answers 404).

The `_headers` rules implemented (the Cloudflare Pages format, https://developers.cloudflare.com/pages/configuration/headers/):
  - a rule is a path pattern on its own line followed by indented `Name: value` lines; `#` starts a comment line;
  - `*` (one per pattern) matches anything, including slashes, and `:splat` in a value is replaced by what it matched;
  - `:name` matches up to the next slash, and `:name` in a value is replaced by what it matched;
  - a request that matches several rules gets the headers of all of them; a header that appears more than once is
    joined with ", "; a line `! Name` removes that header (set by an earlier rule);
  - rules whose pattern starts with `https://` (they name a host) are skipped here, because a local server has one host.
Not implemented: Cloudflare's own default headers, and Pages Functions (to which `_headers` does not apply anyway).

Development helper only: it binds to 127.0.0.1 by default and sends `Cache-Control: no-cache` unless `_headers`
sets its own, so a changed file is never served stale.
Written for Python 3.9 (the version on this machine), standard library only.
"""
import argparse
import functools
import http.server
import os
import re
import sys
from urllib.parse import unquote, urlsplit

# Cloudflare's published limits (same page as above); the tests also check them against public/_headers.
MAX_RULES = 100
MAX_LINE = 2000


def parse_headers(text):
    """Parse `_headers` text into [(pattern, [(op, name, value), ...]), ...]; op is 'set' or 'remove'.

    Raises ValueError, with the line number, for anything malformed (a header line before any rule, a line
    that is neither a path pattern nor `Name: value`, a pattern that does not start with / or https://, more
    rules than Cloudflare allows, or a line longer than it allows).
    """
    rules = []
    current = None
    for number, raw in enumerate(text.splitlines(), 1):
        if len(raw) > MAX_LINE:
            raise ValueError("line %d is longer than %d characters" % (number, MAX_LINE))
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if raw[0] not in " \t":  # a path pattern starts a rule
            if not (line.startswith("/") or line.startswith("https://")):
                raise ValueError("line %d: a rule must start with / or https:// (got %r)" % (number, line))
            current = (line.strip(), [])
            rules.append(current)
            continue
        if current is None:
            raise ValueError("line %d: a header line appears before any path pattern" % number)
        body = line.strip()
        if body.startswith("!"):
            name = body[1:].strip()
            if not name or ":" in name:
                raise ValueError("line %d: expected `! Header-Name`" % number)
            current[1].append(("remove", name, None))
            continue
        name, sep, value = body.partition(":")
        if not sep or not name.strip() or re.search(r"\s", name.strip()):
            raise ValueError("line %d: expected `Name: value` (got %r)" % (number, body))
        current[1].append(("set", name.strip(), value.strip()))
    if len(rules) > MAX_RULES:
        raise ValueError("%d rules; Cloudflare Pages allows at most %d" % (len(rules), MAX_RULES))
    return rules


def compile_pattern(pattern):
    """Turn a path pattern into (regex, names); names lists the placeholder and splat names in order."""
    names = []
    out = []
    for token in re.split(r"(\*|:[A-Za-z][A-Za-z0-9_]*)", pattern):
        if token == "*":
            out.append("(.*)")
            names.append("splat")
        elif token.startswith(":") and len(token) > 1:
            out.append("([^/]+)")
            names.append(token[1:])
        else:
            out.append(re.escape(token))
    return re.compile("^" + "".join(out) + "$"), names


def headers_for(path, rules):
    """The [(name, value), ...] a request for `path` gets, in the order the names first appeared."""
    collected = {}  # lower-case name -> (display name, [values])
    order = []
    for pattern, entries in rules:
        if pattern.startswith("https://"):
            continue
        regex, names = compile_pattern(pattern)
        match = regex.match(path)
        if not match:
            continue
        captured = dict(zip(names, match.groups()))
        for op, name, value in entries:
            key = name.lower()
            if op == "remove":
                collected.pop(key, None)
                if key in order:
                    order.remove(key)
                continue
            for token, text in captured.items():
                value = value.replace(":" + token, text)
            if key not in collected:
                collected[key] = (name, [])
                order.append(key)
            collected[key][1].append(value)
    return [(collected[k][0], ", ".join(collected[k][1])) for k in order]


def self_test():
    """Checks the parser and the matcher against the Cloudflare rules listed in the module docstring."""
    rules = parse_headers(
        "# a comment\n/*\n  X-A: one\n  Cache-Control: public\n/static/*\n  X-A: two\n  X-File: :splat\n"
        "/users/:id/x\n  X-Id: user-:id\n  ! Cache-Control\nhttps://example.com/*\n  X-Host: skipped\n")
    assert headers_for("/index.html", rules) == [("X-A", "one"), ("Cache-Control", "public")]
    assert headers_for("/static/a/b.js", rules) == [("X-A", "one, two"), ("Cache-Control", "public"), ("X-File", "a/b.js")]
    assert headers_for("/users/42/x", rules) == [("X-A", "one"), ("X-Id", "user-42")]
    assert headers_for("/users/42/x/y", rules) == [("X-A", "one"), ("Cache-Control", "public")]
    for bad in ("  X: y", "foo\n  X: y", "/a\n  not a header", "/a\n  !", "/a\n  X: " + "y" * MAX_LINE,
                "".join("/r%d\n  X: y\n" % i for i in range(MAX_RULES + 1))):
        try:
            parse_headers(bad)
        except ValueError:
            continue
        raise AssertionError("should have been rejected: %r" % bad[:40])
    print("serve.py self-test: ok")


class Handler(http.server.SimpleHTTPRequestHandler):
    rules = []

    def request_path(self):
        return unquote(urlsplit(self.path).path)

    def send_head(self):
        # Cloudflare Pages does not serve the rules file itself.
        if self.request_path() in ("/_headers", "/_redirects"):
            self.send_error(404, "File not found")
            return None
        return super().send_head()

    def end_headers(self):
        headers = headers_for(self.request_path(), self.rules)
        if not any(name.lower() == "cache-control" for name, _ in headers):
            self.send_header("Cache-Control", "no-cache")
        for name, value in headers:
            self.send_header(name, value)
        super().end_headers()


def main(argv=None):
    parser = argparse.ArgumentParser(description="Static server that applies a Cloudflare Pages _headers file.")
    parser.add_argument("directory", nargs="?", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public"),
                        help="folder to serve (default: the repo's public folder)")
    parser.add_argument("--port", type=int, default=8766, help="port to listen on (default: 8766)")
    parser.add_argument("--bind", default="127.0.0.1", help="address to bind (default: 127.0.0.1)")
    parser.add_argument("--headers", help="rules file (default: DIRECTORY/_headers)")
    parser.add_argument("--check", metavar="PATH", help="print the headers PATH would get and exit")
    parser.add_argument("--self-test", action="store_true", help="check the rule parser and matcher and exit")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0

    directory = os.path.abspath(args.directory)
    if not os.path.isdir(directory):
        parser.error("not a directory: %s" % directory)
    headers_file = args.headers or os.path.join(directory, "_headers")
    rules = []
    if os.path.isfile(headers_file):
        with open(headers_file, encoding="utf-8") as fh:
            try:
                rules = parse_headers(fh.read())
            except ValueError as err:
                parser.error("%s: %s" % (headers_file, err))
    else:
        print("note: no rules file at %s; serving with no custom headers" % headers_file, file=sys.stderr)

    if args.check is not None:
        for name, value in headers_for(args.check, rules):
            print("%s: %s" % (name, value))
        return 0

    Handler.rules = rules
    handler = functools.partial(Handler, directory=directory)
    server = http.server.ThreadingHTTPServer((args.bind, args.port), handler)
    print("Serving %s on http://%s:%d/ with %d header rule(s) from %s"
          % (directory, args.bind, args.port, len(rules), headers_file if rules else "(none)"), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
