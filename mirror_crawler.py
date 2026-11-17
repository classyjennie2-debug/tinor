import os
import re
import sys
import time
import html as html_lib
import hashlib
import threading
import queue as threadqueue
from urllib.parse import urljoin, urlparse, unquote

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

START_URL = "https://www.tibnor.dk/"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mirror")
MAX_PAGES = int(os.environ.get("MIRROR_MAX_PAGES", "5000"))
MAX_WORKERS = int(os.environ.get("MIRROR_WORKERS", "8"))
MAX_BYTES = int(os.environ.get("MIRROR_MAX_BYTES", str(25 * 1024 * 1024)))
REQUEST_DELAY = float(os.environ.get("MIRROR_DELAY", "0.08"))
USER_AGENT = "Mozilla/5.0 (compatible; SiteMirror/1.0)"

ALLOWED_HOSTS = {"www.tibnor.dk", "tibnor.dk"}
SKIP_PAGE_PREFIXES = (
    "/my-account", "/cart", "/checkout", "/login", "/logout", "/register",
    "/rest", "/search", "/smartedit", "/console", "/api", "/c2c",
    "/address-book", "/forgottenpassword", "/route", "/error",
)
SKIP_ASSET_RE = re.compile(r"\.(zip|rar|7z|exe|dmg|iso|mp4|mov|avi)$", re.IGNORECASE)

URL_ATTR_RE = re.compile(
    r"""(?P<attr>\b(?:href|src|action|poster|data-src|data-href|data-original|data-bg|data-url)\b\s*=\s*)(?P<q>["'])(?P<url>.*?)(?P=q)""",
    re.IGNORECASE | re.DOTALL,
)
SRCSET_RE = re.compile(r"(?P<attr>\bsrcset\s*=\s*)(?P<q>[\"'])(?P<val>.*?)(?P=q)", re.IGNORECASE | re.DOTALL)
CSS_URL_RE = re.compile(r"url\(\s*(?P<q>[\"']?)(?P<url>[^)]+?)(?P=q)\s*\)", re.IGNORECASE)
CSS_IMPORT_RE = re.compile(r"@import\s+(?P<q>[\"'])(?P<url>.*?)(?P=q)", re.IGNORECASE)

_last_request = [0.0]
_request_lock = threading.Lock()
_seen = set()
_seen_lock = threading.Lock()
_stats = {"pages": 0, "assets": 0, "failed": 0}
_stats_lock = threading.Lock()
_stop = threading.Event()

tasks = threadqueue.Queue()
counts = {"scheduled_pages": 0}


def make_session():
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "da-DK,da;q=0.9,en;q=0.8"})
    retry = Retry(total=2, backoff_factor=0.3, status_forcelist=(429, 500, 502, 503, 504))
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.mount("http://", HTTPAdapter(max_retries=retry))
    return s


def throttle():
    with _request_lock:
        wait = REQUEST_DELAY - (time.time() - _last_request[0])
        if wait > 0:
            time.sleep(wait)
        _last_request[0] = time.time()


def is_internal(url):
    p = urlparse(url)
    return p.scheme in ("http", "https") and p.netloc.lower() in ALLOWED_HOSTS


def should_skip_page(url):
    path = urlparse(url).path.lower()
    return path.startswith(SKIP_PAGE_PREFIXES)


def should_skip_asset(url):
    return bool(SKIP_ASSET_RE.search(urlparse(url).path))


def safe_segment(s):
    s = unquote(s)
    s = re.sub(r'[<>:"|?*\\]', "_", s)
    return s.strip(" .") or "_"


def canonical_page_url(url):
    p = urlparse(url)
    return p._replace(query="", fragment="").geturl()


def url_key(url, is_page):
    if is_page:
        url = canonical_page_url(url)
    p = urlparse(url)
    return (p.netloc.lower(), p.path.rstrip("/") or "/", p.query)


def local_rel(url, is_page):
    p = urlparse(url)
    path = unquote(p.path)
    segments = [safe_segment(x) for x in path.split("/") if x not in ("", ".", "..")]
    segments.insert(0, safe_segment(p.netloc))
    if not segments or len(segments) == 1:
        segments.append("index.html")
    elif path.endswith("/"):
        segments.append("index.html")

    last = segments[-1]
    if is_page and not last.lower().endswith((".html", ".htm")):
        segments[-1] = last + ".html"
    elif not is_page and "." not in last:
        segments[-1] = last + ".bin"

    if p.query:
        h = hashlib.md5(p.query.encode("utf-8")).hexdigest()[:8]
        base, ext = os.path.splitext(segments[-1])
        fallback = ".html" if is_page else ".bin"
        segments[-1] = f"{base}__{h}{ext or fallback}"
    return os.path.join(*segments)


def local_abs(url, is_page):
    return os.path.join(OUT_DIR, local_rel(url, is_page))


def rel_link(from_local, target_rel):
    return os.path.relpath(os.path.join(OUT_DIR, target_rel), os.path.dirname(from_local)).replace(os.sep, "/")


def claim(url, is_page):
    key = url_key(url, is_page)
    with _seen_lock:
        if key in _seen:
            return False
        _seen.add(key)
        return True


def schedule(url, is_page, depth=0):
    if _stop.is_set() or not is_internal(url):
        return
    if is_page:
        url = canonical_page_url(url)
    if is_page and should_skip_page(url):
        return
    if not is_page and should_skip_asset(url):
        return
    if not claim(url, is_page):
        return
    if is_page:
        counts["scheduled_pages"] += 1
    tasks.put((url, depth, is_page))


def looks_like_page(url):
    path = urlparse(url).path
    return (not os.path.splitext(path)[1]) or path.endswith(("/", ".html", ".htm", ".php", ".jsp"))


def rewrite_html(html, page_url, page_local):
    found = set()

    def repl(value):
        value = html_lib.unescape(value.strip())
        if not value or value.startswith(("#", "javascript:", "mailto:", "tel:", "data:", "//")):
            return value
        if "{{" in value or "}}" in value or "${" in value:
            return value
        absolute = value if value.lower().startswith(("http://", "https://")) else urljoin(page_url, value)
        if not is_internal(absolute):
            return value
        is_page = looks_like_page(absolute)
        if is_page and should_skip_page(absolute) or (not is_page and should_skip_asset(absolute)):
            return value
        if is_page:
            absolute = canonical_page_url(absolute)
        target = local_rel(absolute, is_page)
        found.add((absolute, is_page))
        return rel_link(page_local, target)

    html = URL_ATTR_RE.sub(lambda m: m.group("attr") + m.group("q") + repl(m.group("url")) + m.group("q"), html)

    def srcset_sub(m):
        parts = []
        for chunk in m.group("val").split(","):
            bits = chunk.strip().split()
            if not bits:
                continue
            bits[0] = repl(bits[0])
            parts.append(" ".join(bits))
        return m.group("attr") + m.group("q") + ", ".join(parts) + m.group("q")

    html = SRCSET_RE.sub(srcset_sub, html)
    html = CSS_URL_RE.sub(lambda m: "url(" + m.group("q") + repl(m.group("url")) + m.group("q") + ")", html)
    return html, found


def rewrite_css(css, css_url, css_local):
    found = set()

    def repl(value):
        value = html_lib.unescape(value.strip().strip("\"'"))
        if not value or value.startswith(("data:", "#", "javascript:")):
            return value
        absolute = urljoin(css_url, value)
        if not is_internal(absolute) or should_skip_asset(absolute):
            return value
        target = local_rel(absolute, False)
        found.add((absolute, False))
        return rel_link(css_local, target)

    css = CSS_URL_RE.sub(lambda m: "url(" + repl(m.group("url")) + ")", css)
    css = CSS_IMPORT_RE.sub(lambda m: m.group("q") + repl(m.group("url")) + m.group("q"), css)
    return css, found


def write_file(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)


def fetch(session, url):
    throttle()
    r = session.get(url, timeout=30, allow_redirects=True)
    if r.status_code >= 400:
        r.close()
        raise RuntimeError(f"HTTP {r.status_code}")
    return r


def process_page(session, url, depth):
    r = fetch(session, url)
    final_url = r.url
    ctype = r.headers.get("Content-Type", "")
    raw = r.content
    r.close()
    if len(raw) > MAX_BYTES:
        return
    if "html" not in ctype.lower():
        write_file(local_abs(final_url, False), raw)
        with _stats_lock:
            _stats["assets"] += 1
        return

    page_local = local_abs(final_url, True)
    text, found = rewrite_html(raw.decode("utf-8", errors="replace"), final_url, page_local)
    write_file(page_local, text.encode("utf-8"))
    with _stats_lock:
        _stats["pages"] += 1
        reached_limit = _stats["pages"] >= MAX_PAGES
    if reached_limit:
        _stop.set()
        return
    for u, is_page in found:
        schedule(u, is_page, depth + 1)


def process_asset(session, url):
    r = fetch(session, url)
    final_url = r.url
    ctype = r.headers.get("Content-Type", "")
    raw = r.content
    r.close()
    if len(raw) > MAX_BYTES:
        return
    if "css" in ctype.lower() or urlparse(final_url).path.lower().endswith(".css"):
        css, found = rewrite_css(raw.decode("utf-8", errors="replace"), final_url, local_abs(final_url, False))
        write_file(local_abs(final_url, False), css.encode("utf-8"))
        for u, _ in found:
            schedule(u, False)
    else:
        write_file(local_abs(final_url, False), raw)
    with _stats_lock:
        _stats["assets"] += 1


def worker(session):
    while True:
        try:
            url, depth, is_page = tasks.get(timeout=0.5)
        except threadqueue.Empty:
            if _stop.is_set():
                return
            continue
        try:
            if is_page:
                if not _stop.is_set():
                    process_page(session, url, depth)
            else:
                process_asset(session, url)
        except Exception as e:
            with _stats_lock:
                _stats["failed"] += 1
            print(f"FAIL {url}: {e}", file=sys.stderr)
        finally:
            tasks.task_done()


def seed_from_sitemap(session):
    try:
        r = fetch(session, "https://www.tibnor.dk/sitemap.xml")
        index = r.text
        r.close()
        for sub in re.findall(r"<loc>(.*?)</loc>", index):
            sub = html_lib.unescape(sub.strip())
            if not is_internal(sub):
                continue
            try:
                r2 = fetch(session, sub)
                for loc in re.findall(r"<loc>(.*?)</loc>", r2.text):
                    schedule(html_lib.unescape(loc.strip()), True, 1)
                r2.close()
            except Exception as e:
                print(f"SITEMAP FAIL {sub}: {e}", file=sys.stderr)
    except Exception as e:
        print(f"SITEMAP FAIL: {e}", file=sys.stderr)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    schedule(START_URL, True)
    seed_from_sitemap(make_session())
    threads = [threading.Thread(target=worker, args=(make_session(),), daemon=True) for _ in range(MAX_WORKERS)]
    for t in threads:
        t.start()

    reporter = threading.Thread(target=report, daemon=True)
    reporter.start()
    tasks.join()
    print(dict(_stats), flush=True)
    print(f"Mirror saved to: {OUT_DIR}", flush=True)


def report():
    while not _stop.is_set() or not tasks.empty():
        with _stats_lock:
            s = dict(_stats)
        print(f"pages={s['pages']} assets={s['assets']} queued={tasks.qsize()} "
              f"scheduled_pages={counts['scheduled_pages']}", flush=True)
        time.sleep(10)


if __name__ == "__main__":
    main()
