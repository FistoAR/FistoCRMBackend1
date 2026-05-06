<?php
/**
 * ╔═══════════════════════════════════════════════════╗
 * ║         NexFile — Single-File PHP File Manager    ║
 * ║         Drop this ONE file on any PHP server      ║
 * ╚═══════════════════════════════════════════════════╝
 *
 * Usage:  Place nexfile.php anywhere in your web root.
 *         Open it in a browser and log in.
 *
 * Login:  admin / admin123  (change DEMO_PASS below!)
 */

session_start();

// ══════════════════════════════════════════════════════════
//  CONFIG — edit these
// ══════════════════════════════════════════════════════════
define('APP_NAME', 'NexFile');
define('APP_VERSION', '1.0');
define('DEMO_USER', 'admin');
define('DEMO_PASS', 'admin123');      // ← CHANGE THIS!
define('MAX_UPLOAD_MB', 50);

// Root is the directory where this file lives — no sub-folder created
define('ROOT_DIR', realpath(__DIR__));

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════
$loggedIn = isset($_SESSION['nf_auth']) && $_SESSION['nf_auth'] === true;

if (isset($_POST['_login'])) {
    if (
        trim($_POST['username'] ?? '') === DEMO_USER &&
        ($_POST['password'] ?? '') === DEMO_PASS
    ) {
        $_SESSION['nf_auth'] = true;
        $_SESSION['nf_user'] = DEMO_USER;
        header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
        exit;
    }
    $loginError = 'Invalid credentials. Try ' . DEMO_USER . ' / ' . DEMO_PASS;
}
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}

// ══════════════════════════════════════════════════════════
//  API — JSON responses (called via fetch from JS)
// ══════════════════════════════════════════════════════════
if (isset($_GET['api']) && $loggedIn) {
    header('Content-Type: application/json');
    header('X-Content-Type-Options: nosniff');
    $action = $_GET['api'];

    function jOk(mixed $d = null): never
    {
        echo json_encode(['ok' => true, 'd' => $d]);
        exit;
    }
    function jErr(string $m, int $c = 400): never
    {
        http_response_code($c);
        echo json_encode(['ok' => false, 'e' => $m]);
        exit;
    }
    function gp(string $k, string $def = ''): string
    {
        $v = $_POST[$k] ?? $_GET[$k] ?? $def;
        return is_string($v) ? trim($v) : $def;
    }

    /** Resolve to safe absolute path, confined to ROOT_DIR */
    function sp(string $rel): string
    {
        $rel = ltrim($rel, '/\\');
        $abs = ROOT_DIR . DIRECTORY_SEPARATOR . $rel;
        $r = realpath($abs);
        if ($r === false) {
            // Path doesn't exist yet — validate parent
            $parent = realpath(dirname($abs));
            if ($parent === false || strpos($parent, ROOT_DIR) !== 0) {
                jErr('Path traversal blocked');
            }
            return $abs;
        }
        if (strpos($r, ROOT_DIR) !== 0)
            jErr('Access denied');
        return $r;
    }
    function rel(string $abs): string
    {
        return ltrim(str_replace(ROOT_DIR, '', $abs), DIRECTORY_SEPARATOR . '/');
    }
    function fmtSz(int $b): string
    {
        if ($b < 1024)
            return $b . ' B';
        if ($b < 1048576)
            return round($b / 1024, 1) . ' KB';
        if ($b < 1073741824)
            return round($b / 1048576, 1) . ' MB';
        return round($b / 1073741824, 2) . ' GB';
    }
    function fCat(string $name): string
    {
        $e = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        foreach ([
            'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
            'video' => ['mp4', 'webm', 'avi', 'mov', 'mkv'],
            'audio' => ['mp3', 'wav', 'ogg', 'flac', 'aac'],
            'archive' => ['zip', 'tar', 'gz', '7z', 'rar', 'bz2'],
            'code' => ['php', 'js', 'ts', 'py', 'rb', 'java', 'c', 'cpp', 'css', 'html', 'htm', 'sh', 'go'],
            'data' => ['json', 'xml', 'yaml', 'yml', 'csv', 'sql', 'ini', 'conf', 'toml'],
            'document' => ['txt', 'md', 'log', 'pdf', 'doc', 'docx'],
        ] as $cat => $exts)
            if (in_array($e, $exts, true))
                return $cat;
        return 'file';
    }
    function fi(string $abs): array
    {
        $n = $isDir = is_dir($abs);
        $name = basename($abs);
        $sz = $isDir ? 0 : filesize($abs);
        $ext = $isDir ? '' : strtolower(pathinfo($name, PATHINFO_EXTENSION));
        return [
            'name' => $name,
            'path' => rel($abs),
            'isDir' => $isDir,
            'ext' => $ext,
            'size' => $sz,
            'sizeH' => fmtSz($sz),
            'mod' => filemtime($abs),
            'cat' => $isDir ? 'folder' : fCat($name),
            'w' => is_writable($abs)
        ];
    }
    function rmRec(string $dir): bool
    {
        $e = @scandir($dir);
        if (!$e)
            return false;
        foreach ($e as $f) {
            if ($f === '.' || $f === '..')
                continue;
            $p = $dir . DIRECTORY_SEPARATOR . $f;
            is_dir($p) ? rmRec($p) : @unlink($p);
        }
        return @rmdir($dir);
    }

    try {
        switch ($action) {

            case 'list':
                $dir = gp('path') === '' ? ROOT_DIR : sp(gp('path'));
                if (!is_dir($dir))
                    jErr('Not a directory');
                $entries = @scandir($dir);
                if (!$entries)
                    jErr('Cannot read');
                $items = [];
                foreach ($entries as $e) {
                    if ($e === '.' || $e === '..')
                        continue;
                    $items[] = fi($dir . DIRECTORY_SEPARATOR . $e);
                }
                usort($items, fn($a, $b) => $b['isDir'] <=> $a['isDir'] ?: strcasecmp($a['name'], $b['name']));
                jOk(['items' => $items, 'path' => gp('path')]);

            case 'tree':
                function tree(string $dir, int $d = 0): array
                {
                    if ($d > 6)
                        return [];
                    $e = @scandir($dir);
                    if (!$e)
                        return [];
                    $out = [];
                    foreach ($e as $f) {
                        if ($f === '.' || $f === '..')
                            continue;
                        $a = $dir . DIRECTORY_SEPARATOR . $f;
                        if (is_dir($a))
                            $out[] = ['name' => $f, 'path' => rel($a), 'ch' => tree($a, $d + 1)];
                    }
                    usort($out, fn($a, $b) => strcasecmp($a['name'], $b['name']));
                    return $out;
                }
                jOk(['tree' => tree(ROOT_DIR)]);

            case 'mkdir':
                $name = gp('name');
                if (!$name)
                    jErr('Name required');
                if (preg_match('/[\/\\\\<>:"\|?*\x00-\x1f]/', $name))
                    jErr('Invalid name');
                $base = gp('path') === '' ? ROOT_DIR : sp(gp('path'));
                $nd = $base . DIRECTORY_SEPARATOR . $name;
                if (file_exists($nd))
                    jErr('Already exists');
                if (!@mkdir($nd, 0755))
                    jErr('Failed');
                jOk(['item' => fi($nd)]);

            case 'touch':
                $name = gp('name');
                if (!$name)
                    jErr('Name required');
                if (preg_match('/[\/\\\\<>:"\|?*\x00-\x1f]/', $name))
                    jErr('Invalid name');
                $base = gp('path') === '' ? ROOT_DIR : sp(gp('path'));
                $nf = $base . DIRECTORY_SEPARATOR . $name;
                if (file_exists($nf))
                    jErr('Already exists');
                if (@file_put_contents($nf, '') === false)
                    jErr('Failed');
                jOk(['item' => fi($nf)]);

            case 'rename':
                $p = gp('path');
                $n = gp('name');
                if (!$p || !$n)
                    jErr('Path and name required');
                if (preg_match('/[\/\\\\<>:"\|?*\x00-\x1f]/', $n))
                    jErr('Invalid name');
                $a = sp($p);
                $na = dirname($a) . DIRECTORY_SEPARATOR . $n;
                if (!file_exists($a))
                    jErr('Not found');
                if (file_exists($na))
                    jErr('Target exists');
                if (!@rename($a, $na))
                    jErr('Rename failed');
                jOk(['item' => fi($na)]);

            case 'delete':
                $paths = $_POST['paths'] ?? [];
                if (empty($paths) && isset($_POST['path']))
                    $paths = [$_POST['path']];
                if (empty($paths))
                    jErr('No paths');
                $del = [];
                $err = [];
                foreach ($paths as $p) {
                    try {
                        $a = sp($p);
                        if (!file_exists($a)) {
                            $err[] = "$p: not found";
                            continue;
                        }
                        (is_dir($a) ? rmRec($a) : @unlink($a)) ? $del[] = $p : ($err[] = "$p: failed");
                    } catch (Throwable $ex) {
                        $err[] = $p . ': ' . $ex->getMessage();
                    }
                }
                if (!empty($err) && empty($del))
                    jErr(implode('; ', $err));
                jOk(['del' => $del, 'err' => $err]);

            case 'upload':
                $dest = gp('path') === '' ? ROOT_DIR : sp(gp('path'));
                if (!is_dir($dest))
                    jErr('Not a directory');
                if (empty($_FILES['files']))
                    jErr('No files');
                $max = MAX_UPLOAD_MB * 1024 * 1024;
                $up = [];
                $err = [];
                $files = $_FILES['files'];
                $reindexed = [];
                foreach ($files['name'] as $i => $name)
                    $reindexed[] = ['name' => $name, 'tmp' => $files['tmp_name'][$i], 'err' => $files['error'][$i], 'sz' => $files['size'][$i]];
                foreach ($reindexed as $f) {
                    if ($f['err'] !== UPLOAD_ERR_OK) {
                        $err[] = $f['name'] . ': upload error';
                        continue;
                    }
                    if ($f['sz'] > $max) {
                        $err[] = $f['name'] . ': too large';
                        continue;
                    }
                    $n = preg_replace('/[^a-zA-Z0-9._\- ]/', '_', $f['name']);
                    $n = ltrim($n, '.');
                    $d = $dest . DIRECTORY_SEPARATOR . $n;
                    if (file_exists($d)) {
                        $pi = pathinfo($d);
                        $d = $pi['dirname'] . DIRECTORY_SEPARATOR . $pi['filename'] . '_' . time() . (isset($pi['extension']) ? '.' . $pi['extension'] : '');
                    }
                    @move_uploaded_file($f['tmp'], $d) ? $up[] = fi($d) : ($err[] = $f['name'] . ': move failed');
                }
                jOk(['up' => $up, 'err' => $err]);

            case 'download':
                $a = sp(gp('path'));
                if (!is_file($a))
                    jErr('Not a file');
                $mime = mime_content_type($a) ?: 'application/octet-stream';
                header('Content-Type: ' . $mime);
                header('Content-Disposition: attachment; filename="' . addslashes(basename($a)) . '"');
                header('Content-Length: ' . filesize($a));
                ob_clean();
                flush();
                readfile($a);
                exit;

            case 'read':
                $a = sp(gp('path'));
                if (!is_file($a))
                    jErr('Not a file');
                if (filesize($a) > 2 * 1024 * 1024)
                    jErr('File too large to edit (>2MB)');
                $c = file_get_contents($a);
                if ($c === false)
                    jErr('Cannot read');
                jOk(['content' => $c, 'name' => basename($a)]);

            case 'write':
                $a = sp(gp('path'));
                if (!is_file($a))
                    jErr('Not a file');
                if (!is_writable($a))
                    jErr('Not writable');
                $c = $_POST['content'] ?? '';
                if (file_put_contents($a, $c) === false)
                    jErr('Write failed');
                jOk(['size' => filesize($a)]);

            case 'zip':
                if (!class_exists('ZipArchive'))
                    jErr('ZipArchive not available');
                $paths = $_POST['paths'] ?? [];
                if (empty($paths))
                    jErr('No items');
                $name = gp('name', 'archive_' . date('Ymd_His') . '.zip');
                if (!preg_match('/\.zip$/i', $name))
                    $name .= '.zip';
                $name = preg_replace('/[^a-zA-Z0-9._\-]/', '_', $name);
                $destDir = gp('path') === '' ? ROOT_DIR : sp(gp('path'));
                $zp = $destDir . DIRECTORY_SEPARATOR . $name;
                $z = new ZipArchive();
                if ($z->open($zp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true)
                    jErr('Cannot create zip');
                function addZ(ZipArchive $z, string $dir, string $pre): void
                {
                    $z->addEmptyDir($pre);
                    $e = @scandir($dir);
                    if (!$e)
                        return;
                    foreach ($e as $f) {
                        if ($f === '.' || $f === '..')
                            continue;
                        $a = $dir . DIRECTORY_SEPARATOR . $f;
                        is_dir($a) ? addZ($z, $a, $pre . '/' . $f) : $z->addFile($a, $pre . '/' . $f);
                    }
                }
                foreach ($paths as $p) {
                    $a = sp($p);
                    is_dir($a) ? addZ($z, $a, basename($a)) : $z->addFile($a, basename($a));
                }
                $z->close();
                jOk(['item' => fi($zp)]);

            case 'unzip':
                if (!class_exists('ZipArchive'))
                    jErr('ZipArchive not available');
                $a = sp(gp('path'));
                if (!is_file($a))
                    jErr('Not found');
                if (strtolower(pathinfo($a, PATHINFO_EXTENSION)) !== 'zip')
                    jErr('Not a zip');
                $dd = dirname($a) . DIRECTORY_SEPARATOR . pathinfo($a, PATHINFO_FILENAME);
                if (!is_dir($dd))
                    @mkdir($dd, 0755, true);
                $z = new ZipArchive();
                if ($z->open($a) !== true)
                    jErr('Cannot open zip');
                // zip-slip guard
                $realDd = realpath($dd);
                for ($i = 0; $i < $z->numFiles; $i++) {
                    $en = $z->getNameIndex($i);
                    $ep = str_replace('\\', '/', $realDd) . '/' . str_replace('\\', '/', $en);
                    if (strpos($ep, str_replace('\\', '/', $realDd) . '/') !== 0) {
                        $z->close();
                        jErr('Zip-slip detected in: ' . htmlspecialchars($en));
                    }
                }
                $z->extractTo($dd);
                $z->close();
                jOk(['path' => rel($dd)]);

            case 'search':
                $q = strtolower(gp('query'));
                if (!$q)
                    jErr('Query required');
                $base = gp('path') === '' ? ROOT_DIR : sp(gp('path'));
                $results = [];
                function srch(string $dir, string $q, array &$out, int $d = 0): void
                {
                    if ($d > 8)
                        return;
                    $e = @scandir($dir);
                    if (!$e)
                        return;
                    foreach ($e as $f) {
                        if ($f === '.' || $f === '..')
                            continue;
                        $a = $dir . DIRECTORY_SEPARATOR . $f;
                        if (stripos($f, $q) !== false)
                            $out[] = fi($a);
                        if (is_dir($a))
                            srch($a, $q, $out, $d + 1);
                    }
                }
                srch($base, $q, $results);
                usort($results, fn($a, $b) => strcasecmp($a['name'], $b['name']));
                jOk(['results' => $results, 'query' => $q]);

            case 'details':
                $a = sp(gp('path'));
                if (!file_exists($a))
                    jErr('Not found');
                $info = fi($a);
                $info['perms'] = substr(sprintf('%o', fileperms($a)), -4);
                $info['modH'] = date('Y-m-d H:i:s', $info['mod']);
                if (is_dir($a)) {
                    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($a, FilesystemIterator::SKIP_DOTS));
                    $cnt = 0;
                    $tsz = 0;
                    foreach ($it as $f) {
                        $cnt++;
                        if ($f->isFile())
                            $tsz += $f->getSize();
                    }
                    $info['cnt'] = $cnt;
                    $info['tsz'] = fmtSz($tsz);
                }
                jOk($info);

            default:
                jErr('Unknown action: ' . htmlspecialchars($action));
        }
    } catch (Throwable $ex) {
        jErr('Server error: ' . $ex->getMessage());
    }
}

// ══════════════════════════════════════════════════════════
//  HTML OUTPUT
// ══════════════════════════════════════════════════════════
$me = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= APP_NAME ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
/* ════════════════════════════════════════════════
   RESET & VARIABLES
════════════════════════════════════════════════ */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
    --tb:52px; --sw:240px;
    --bg:#0d1117; --sf:#161b22; --sf2:#1c2333; --sf3:#212940;
    --bd:#2d3748; --bd2:#1f2a3c;
    --tx:#cdd9e5; --tx2:#8b949e; --tx3:#57636e;
    --ac:#58a6ff; --ac-d:rgba(88,166,255,.12); --ac2:#bc8cff;
    --gr:#3fb950; --rd:#f85149; --yw:#d29922;
    --sh-sm:0 1px 3px rgba(0,0,0,.4);
    --sh-md:0 4px 16px rgba(0,0,0,.5);
    --sh-lg:0 12px 40px rgba(0,0,0,.7);
    --r:8px; --rs:5px; --rl:12px; --t:.15s ease;
}
[data-theme="light"]{
    --bg:#f6f8fa; --sf:#fff; --sf2:#f0f3f7; --sf3:#e4e9f0;
    --bd:#d0d7de; --bd2:#e1e7ef;
    --tx:#24292f; --tx2:#57606a; --tx3:#8c959f;
    --ac:#0969da; --ac-d:rgba(9,105,218,.08); --ac2:#8250df;
    --gr:#1a7f37; --rd:#cf222e;
    --sh-sm:0 1px 3px rgba(0,0,0,.1);
    --sh-md:0 4px 16px rgba(0,0,0,.12);
    --sh-lg:0 12px 40px rgba(0,0,0,.2);
}
html,body{height:100%;font-family:'DM Sans',sans-serif;font-size:14px;background:var(--bg);color:var(--tx);overflow:hidden;-webkit-font-smoothing:antialiased}
a{color:var(--ac);text-decoration:none}
button{font-family:inherit;cursor:pointer}
input,textarea{font-family:inherit}
::selection{background:var(--ac-d);color:var(--ac)}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--tx3)}

/* ════════════════════════════════════════════════
   LOGIN
════════════════════════════════════════════════ */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.login-wrap::before{content:'';position:fixed;inset:0;
    background-image:linear-gradient(rgba(88,166,255,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(88,166,255,.05) 1px,transparent 1px);
    background-size:40px 40px;animation:gm 20s linear infinite}
@keyframes gm{to{background-position:40px 40px}}
.login-card{position:relative;z-index:2;background:var(--sf);border:1px solid var(--bd);border-radius:20px;padding:48px 44px;width:100%;max-width:400px;box-shadow:var(--sh-lg);animation:slideUp .4s cubic-bezier(.16,1,.3,1)}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.lg-logo{text-align:center;margin-bottom:32px}
.lg-icon{width:52px;height:52px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;box-shadow:0 8px 28px rgba(88,166,255,.35)}
.lg-name{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.lg-sub{color:var(--tx3);font-size:12px;margin-top:3px}
.lg-grp{margin-bottom:16px}
.lg-lbl{display:block;font-size:11px;font-weight:500;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}
.lg-inp{width:100%;background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:11px 14px;color:var(--tx);font-size:14px;outline:none;transition:border-color var(--t),box-shadow var(--t)}
.lg-inp:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--ac-d)}
.lg-btn{width:100%;background:linear-gradient(135deg,var(--ac),var(--ac2));border:none;border-radius:10px;padding:12px;color:#fff;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-top:6px;transition:opacity var(--t),transform .1s}
.lg-btn:hover{opacity:.88;transform:translateY(-1px)}
.lg-err{background:rgba(248,81,73,.1);border:1px solid rgba(248,81,73,.3);border-radius:8px;padding:9px 13px;font-size:13px;color:var(--rd);margin-bottom:16px}
.lg-hint{text-align:center;font-size:12px;color:var(--tx3);margin-top:18px;padding-top:18px;border-top:1px solid var(--bd)}
.lg-hint code{background:var(--bg);border:1px solid var(--bd);border-radius:4px;padding:1px 5px;color:var(--ac);font-family:'DM Mono',monospace}

/* ════════════════════════════════════════════════
   TOPBAR
════════════════════════════════════════════════ */
.topbar{position:fixed;top:0;left:0;right:0;height:var(--tb);background:var(--sf);border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;padding:0 14px;z-index:100;box-shadow:var(--sh-sm)}
.tb-l{display:flex;align-items:center;gap:8px;min-width:var(--sw)}
.tb-c{flex:1;max-width:500px;margin:0 auto}
.tb-r{display:flex;align-items:center;gap:8px;margin-left:auto}
.hbg{background:none;border:none;padding:5px;display:flex;flex-direction:column;gap:4px;border-radius:var(--rs);transition:background var(--t)}
.hbg:hover{background:var(--sf2)}
.hbg span{display:block;width:17px;height:2px;background:var(--tx2);border-radius:2px}
.logo{display:flex;align-items:center;gap:7px}
.logo-i{font-size:18px}
.logo-t{font-family:'Syne',sans-serif;font-weight:800;font-size:17px;color:var(--tx);letter-spacing:-.2px}
.sw-wrap{position:relative;display:flex;align-items:center}
.sw-ico{position:absolute;left:9px;font-size:12px;pointer-events:none;opacity:.5}
#searchInput{width:100%;background:var(--bg);border:1px solid var(--bd);border-radius:20px;padding:6px 30px 6px 30px;color:var(--tx);font-size:13px;outline:none;transition:border-color var(--t),box-shadow var(--t)}
#searchInput:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--ac-d)}
.sw-clr{position:absolute;right:9px;background:none;border:none;font-size:11px;color:var(--tx3);opacity:0;pointer-events:none;transition:opacity var(--t)}
.sw-clr.vis{opacity:1;pointer-events:all}
.usr-badge{display:flex;align-items:center;gap:7px;background:var(--sf2);border:1px solid var(--bd);border-radius:20px;padding:3px 9px 3px 7px}
.usr-name{font-size:13px;color:var(--tx2)}
.btn-lo{font-size:13px;color:var(--tx3);transition:color var(--t)}
.btn-lo:hover{color:var(--rd)}

/* ════════════════════════════════════════════════
   LAYOUT
════════════════════════════════════════════════ */
.app{display:flex;position:fixed;top:var(--tb);left:0;right:0;bottom:0;overflow:hidden}
.sidebar{width:var(--sw);min-width:var(--sw);background:var(--sf);border-right:1px solid var(--bd);display:flex;flex-direction:column;overflow:hidden;transition:width .25s cubic-bezier(.4,0,.2,1),min-width .25s cubic-bezier(.4,0,.2,1)}
.sidebar.col{width:0;min-width:0}
.sb-hd{padding:10px 13px;border-bottom:1px solid var(--bd2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.sb-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)}
.tree-wrap{overflow-y:auto;overflow-x:hidden;flex:1;padding:6px 0}
.tree-row{display:flex;align-items:center;gap:4px;padding:4px 10px;cursor:pointer;transition:background var(--t);white-space:nowrap;overflow:hidden}
.tree-row:hover{background:var(--sf2)}
.tree-row.act{background:var(--ac-d);color:var(--ac)}
.tr-arr{font-size:10px;width:13px;text-align:center;color:var(--tx3);transition:transform var(--t);flex-shrink:0}
.tr-arr.open{transform:rotate(90deg)}
.tr-arr.emp{opacity:0}
.tr-ico{font-size:14px;flex-shrink:0}
.tr-nm{font-size:13px;overflow:hidden;text-overflow:ellipsis;flex:1}
.tree-ch{padding-left:11px}
.tree-ch.hid{display:none}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.ph{background:var(--sf);border-bottom:1px solid var(--bd);flex-shrink:0}
.bc{display:flex;align-items:center;flex-wrap:wrap;gap:2px;padding:7px 14px;border-bottom:1px solid var(--bd2);overflow-x:auto;white-space:nowrap}
.crumb{font-size:13px;color:var(--tx2);padding:2px 5px;border-radius:var(--rs);cursor:pointer;transition:background var(--t),color var(--t);flex-shrink:0}
.crumb:hover{background:var(--sf2);color:var(--tx)}
.crumb.act{color:var(--tx);font-weight:500;cursor:default}
.crumb:not(:last-child)::after{content:'/';margin-left:5px;color:var(--tx3)}
.tb{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;gap:8px;flex-wrap:wrap}
.tb-left,.tb-right{display:flex;align-items:center;gap:5px}
.btn{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--bd);background:var(--sf2);color:var(--tx);border-radius:var(--rs);padding:4px 10px;font-size:13px;font-weight:500;cursor:pointer;transition:background var(--t),border-color var(--t),transform .1s}
.btn:hover{background:var(--sf3)}
.btn:active{transform:scale(.97)}
.btn.sm{padding:3px 8px;font-size:12px}
.btn.pri{background:var(--ac);border-color:var(--ac);color:#fff}
.btn.pri:hover{opacity:.85}
.btn.dng{color:var(--rd);border-color:var(--rd)}
.btn.dng:hover{background:rgba(248,81,73,.1)}
.btn.ghost{background:transparent;border-color:transparent}
.btn.ghost:hover{background:var(--sf2)}
.btn.upl{color:var(--ac);border-color:var(--ac-d)}
.bi{background:none;border:none;padding:4px 6px;font-size:13px;color:var(--tx2);border-radius:var(--rs);transition:background var(--t),color var(--t)}
.bi:hover{background:var(--sf2);color:var(--tx)}
.bi.act{background:var(--ac-d);color:var(--ac)}
.vt{display:flex;background:var(--bg);border:1px solid var(--bd);border-radius:var(--rs);overflow:hidden}
.vt .bi{border-radius:0;border:none}
.ic{font-size:12px;color:var(--tx3)}
.hid{display:none!important}

/* ════════════════════════════════════════════════
   FILE AREA
════════════════════════════════════════════════ */
.fa{flex:1;overflow-y:auto;padding:12px;position:relative}
.drop-ov{position:absolute;inset:0;background:rgba(88,166,255,.07);border:2px dashed var(--ac);border-radius:var(--r);z-index:20;display:flex;align-items:center;justify-content:center;pointer-events:none}
.drop-msg{display:flex;flex-direction:column;align-items:center;gap:9px;color:var(--ac)}
.drop-msg .di{font-size:44px}
.drop-msg span:last-child{font-size:17px;font-weight:600}
.spin-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:60px;color:var(--tx3)}
.spin{width:26px;height:26px;border:2px solid var(--bd);border-top-color:var(--ac);border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.fl{display:flex;flex-direction:column;gap:2px}
.fl-hd{display:grid;grid-template-columns:26px 1fr 80px 140px 70px;gap:8px;padding:4px 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);border-bottom:1px solid var(--bd2);margin-bottom:4px}
.fi{display:grid;grid-template-columns:26px 1fr 80px 140px 70px;gap:8px;align-items:center;padding:5px 9px;border-radius:var(--rs);cursor:pointer;user-select:none;border:1px solid transparent;transition:background var(--t),border-color var(--t);animation:fIn .14s ease both}
@keyframes fIn{from{opacity:0;transform:translateY(3px)}to{opacity:1}}
.fi:hover{background:var(--sf2)}
.fi.sel{background:var(--ac-d);border-color:rgba(88,166,255,.2)}
.fi-chk{display:flex;align-items:center;justify-content:center}
.fi-chk input[type=checkbox]{width:13px;height:13px;accent-color:var(--ac);cursor:pointer}
.fi-nm{display:flex;align-items:center;gap:7px;min-width:0}
.f-ico{font-size:15px;flex-shrink:0}
.f-nm{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fi.dir .f-nm{font-weight:500}
.f-sz,.f-mod{font-size:12px;color:var(--tx3);white-space:nowrap}
.f-tp .badge{background:var(--sf3);border-radius:4px;padding:1px 5px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.03em}
.fg{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:9px}
.fgi{display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 8px 10px;border-radius:var(--r);cursor:pointer;user-select:none;border:1px solid transparent;background:var(--sf);transition:background var(--t),border-color var(--t),transform .1s;text-align:center;animation:fIn .14s ease both;position:relative}
.fgi:hover{background:var(--sf2);border-color:var(--bd);transform:translateY(-2px)}
.fgi.sel{background:var(--ac-d);border-color:rgba(88,166,255,.35)}
.fgi .f-ico{font-size:34px}
.fgi .f-nm{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}
.fgi .f-sz{font-size:11px;color:var(--tx3)}
.g-chk{position:absolute;top:5px;left:5px;opacity:0;transition:opacity var(--t)}
.fgi:hover .g-chk,.fgi.sel .g-chk{opacity:1}
.g-chk input{width:12px;height:12px;accent-color:var(--ac)}
.empty-st{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:70px 20px;color:var(--tx3)}
.empty-st .ei{font-size:44px;opacity:.35}
.empty-st .et{font-size:15px;font-weight:500}
.empty-st .es{font-size:13px}
.upb{position:absolute;bottom:0;left:0;right:0;height:34px;background:var(--sf);border-top:1px solid var(--bd);display:flex;align-items:center;padding:0 14px;gap:10px}
.upb-bar{flex:1;height:5px;background:var(--bd);border-radius:3px;overflow:hidden;position:relative}
.upb-bar::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,var(--ac),var(--ac2));border-radius:3px;width:var(--p,0%);transition:width .2s ease}
.upb-txt{font-size:12px;color:var(--tx2);white-space:nowrap}
.srb{background:var(--ac-d);border:1px solid rgba(88,166,255,.2);border-radius:var(--rs);padding:7px 12px;font-size:13px;color:var(--ac);display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}

/* ════════════════════════════════════════════════
   CONTEXT MENU
════════════════════════════════════════════════ */
.ctx{position:fixed;background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);box-shadow:var(--sh-lg);padding:4px;min-width:175px;z-index:500;animation:ctxIn .12s ease both}
@keyframes ctxIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.ci{display:flex;align-items:center;gap:7px;padding:6px 11px;border-radius:var(--rs);font-size:13px;color:var(--tx);cursor:pointer;transition:background var(--t);white-space:nowrap}
.ci:hover{background:var(--sf2)}
.ci.dng{color:var(--rd)}
.ci.dng:hover{background:rgba(248,81,73,.1)}
.cs{height:1px;background:var(--bd2);margin:3px 0;pointer-events:none}

/* ════════════════════════════════════════════════
   MODALS
════════════════════════════════════════════════ */
.mo{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:300;display:flex;align-items:center;justify-content:center;padding:18px;animation:moFd .18s ease}
@keyframes moFd{from{opacity:0}to{opacity:1}}
.md{background:var(--sf);border:1px solid var(--bd);border-radius:var(--rl);box-shadow:var(--sh-lg);width:100%;max-width:460px;max-height:90vh;display:flex;flex-direction:column;animation:mdIn .2s cubic-bezier(.16,1,.3,1)}
@keyframes mdIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
.md.xl{max-width:880px}
.md.sm{max-width:360px}
.mh{padding:14px 18px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:8px}
.mh h3{font-family:'Syne',sans-serif;font-size:15px;font-weight:700}
.mh-acts{display:flex;align-items:center;gap:7px}
.mc{background:none;border:none;font-size:14px;color:var(--tx3);border-radius:var(--rs);padding:3px 6px;transition:background var(--t),color var(--t)}
.mc:hover{background:var(--sf2);color:var(--rd)}
.mb{padding:18px;overflow-y:auto}
.mb.full{padding:0;flex:1;min-height:0}
.mf{padding:12px 18px;border-top:1px solid var(--bd);display:flex;justify-content:flex-end;gap:7px;flex-shrink:0}
.mi{width:100%;background:var(--bg);border:1px solid var(--bd);border-radius:var(--rs);padding:9px 11px;color:var(--tx);font-size:14px;outline:none;transition:border-color var(--t),box-shadow var(--t)}
.mi:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--ac-d)}
.mhint{font-size:12px;color:var(--tx3);margin-top:7px}
.el-lang{font-family:'DM Mono',monospace;font-size:11px;color:var(--tx3);background:var(--sf2);border:1px solid var(--bd);border-radius:4px;padding:2px 7px}
#editorArea{width:100%;height:100%;min-height:480px;background:var(--bg);border:none;outline:none;resize:none;color:var(--tx);font-family:'DM Mono','Courier New',monospace;font-size:13px;line-height:1.65;padding:14px 18px;tab-size:2}
#prevContent{padding:18px;min-height:380px;display:flex;align-items:flex-start;justify-content:center}
#prevContent img{max-width:100%;max-height:65vh;border-radius:var(--r);object-fit:contain}
#prevContent pre{font-family:'DM Mono',monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-all;width:100%;color:var(--tx)}
.dt{width:100%;border-collapse:collapse}
.dt tr{border-bottom:1px solid var(--bd2)}
.dt td{padding:7px 3px;font-size:13px;vertical-align:top}
.dt td:first-child{color:var(--tx3);width:105px;font-weight:500;white-space:nowrap}
.dt td:last-child{color:var(--tx);font-family:'DM Mono',monospace;font-size:12px;word-break:break-all}

/* ════════════════════════════════════════════════
   TOASTS
════════════════════════════════════════════════ */
.tc{position:fixed;bottom:18px;right:18px;display:flex;flex-direction:column;gap:7px;z-index:600;max-width:320px}
.toast{display:flex;align-items:flex-start;gap:9px;background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:11px 13px;box-shadow:var(--sh-md);animation:tIn .28s cubic-bezier(.16,1,.3,1) both;font-size:13px}
@keyframes tIn{from{opacity:0;transform:translateX(16px) scale(.95)}to{opacity:1;transform:none}}
.toast.out{animation:tOut .22s ease both}
@keyframes tOut{to{opacity:0;transform:translateX(16px) scale(.95);max-height:0;padding:0;margin:0}}
.t-ico{font-size:15px;flex-shrink:0;margin-top:1px}
.t-bd{flex:1}
.t-ttl{font-weight:600;margin-bottom:1px}
.t-msg{color:var(--tx2)}
.toast.ok .t-ttl{color:var(--gr)}
.toast.err .t-ttl{color:var(--rd)}
.toast.inf .t-ttl{color:var(--ac)}
.toast.wrn .t-ttl{color:var(--yw)}

/* ════════════════════════════════════════════════
   RESPONSIVE
════════════════════════════════════════════════ */
@media(max-width:700px){
    :root{--sw:200px}
    .tb-c{display:none}
    .fl-hd{display:none}
    .fi{grid-template-columns:26px 1fr 80px}
    .f-sz,.fi .f-mod,.fi .f-tp{display:none}
}
@media(max-width:480px){
    .sidebar{position:absolute;top:0;bottom:0;z-index:50;box-shadow:var(--sh-lg)}
}
</style>
</head>
<body>

<?php if (!$loggedIn): ?>
    <!-- ════════ LOGIN ════════ -->
    <div class="login-wrap">
      <div class="login-card">
        <div class="lg-logo">
          <div class="lg-icon">📁</div>
          <div class="lg-name"><?= APP_NAME ?></div>
          <div class="lg-sub">Web File Manager <?= APP_VERSION ?></div>
        </div>
        <?php if (!empty($loginError)): ?>
              <div class="lg-err">⚠ <?= htmlspecialchars($loginError) ?></div>
        <?php endif; ?>
        <form method="POST">
          <div class="lg-grp">
            <label class="lg-lbl">Username</label>
            <input class="lg-inp" type="text" name="username" placeholder="admin" autocomplete="username" required>
          </div>
          <div class="lg-grp">
            <label class="lg-lbl">Password</label>
            <input class="lg-inp" type="password" name="password" placeholder="••••••••" autocomplete="current-password" required>
          </div>
          <button class="lg-btn" type="submit" name="_login">Sign In →</button>
        </form>
        <div class="lg-hint">Demo: <code>admin</code> / <code>admin123</code></div>
      </div>
    </div>

<?php else: ?>
    <!-- ════════ APP ════════ -->

    <!-- TOPBAR -->
    <header class="topbar">
      <div class="tb-l">
        <button class="hbg" id="sbToggle"><span></span><span></span><span></span></button>
        <div class="logo"><span class="logo-i">📁</span><span class="logo-t"><?= APP_NAME ?></span></div>
      </div>
      <div class="tb-c">
        <div class="sw-wrap">
          <span class="sw-ico">🔍</span>
          <input type="text" id="searchInput" placeholder="Search files and folders…" autocomplete="off">
          <button class="sw-clr" id="swClr">✕</button>
        </div>
      </div>
      <div class="tb-r">
        <button class="bi" id="themeBtn" title="Toggle theme">🌙</button>
        <div class="usr-badge">
          <span>👤</span>
          <span class="usr-name"><?= htmlspecialchars($_SESSION['nf_user'] ?? 'admin') ?></span>
          <a href="?logout" class="btn-lo" title="Logout">⏏</a>
        </div>
      </div>
    </header>

    <!-- LAYOUT -->
    <div class="app">
      <!-- SIDEBAR -->
      <aside class="sidebar" id="sidebar">
        <div class="sb-hd">
          <span class="sb-title">Explorer</span>
          <button class="bi" id="refreshTree" title="Refresh" style="font-size:15px">↺</button>
        </div>
        <div class="tree-wrap" id="fileTree"><div style="padding:14px;color:var(--tx3);font-size:13px">Loading…</div></div>
      </aside>

      <!-- MAIN -->
      <main class="main">
        <div class="ph">
          <nav class="bc" id="bc"><span class="crumb act" data-path="">🏠 Root</span></nav>
          <div class="tb">
            <div class="tb-left">
              <button class="btn sm" id="btnMkdir">📁 New Folder</button>
              <button class="btn sm" id="btnTouch">📄 New File</button>
              <button class="btn sm upl" id="btnUpload">⬆ Upload</button>
              <input type="file" id="fileInput" multiple hidden>
            </div>
            <div class="tb-right">
              <button class="btn sm dng hid" id="btnBulkDel">🗑 Delete</button>
              <button class="btn sm hid" id="btnBulkZip">🗜 Zip</button>
              <div class="vt">
                <button class="bi act" id="vList" title="List">☰</button>
                <button class="bi" id="vGrid" title="Grid">⊞</button>
              </div>
              <span class="ic" id="ic"></span>
            </div>
          </div>
        </div>

        <div class="fa" id="fa">
          <div class="drop-ov hid" id="dropOv">
            <div class="drop-msg"><span class="di">☁</span><span>Drop files to upload</span></div>
          </div>
          <div id="fl"><div class="spin-wrap"><div class="spin"></div><span>Loading…</span></div></div>
        </div>

        <div class="upb hid" id="upb">
          <div class="upb-bar" id="upbBar"></div>
          <span class="upb-txt" id="upbTxt">Uploading…</span>
        </div>
      </main>
    </div>

    <!-- CONTEXT MENU -->
    <div class="ctx hid" id="ctx">
      <div class="ci" data-a="open">📂 Open</div>
      <div class="ci" data-a="download">⬇ Download</div>
      <div class="ci" data-a="edit">✏ Edit</div>
      <div class="cs"></div>
      <div class="ci" data-a="rename">🏷 Rename</div>
      <div class="ci" data-a="zip">🗜 Compress to Zip</div>
      <div class="ci" data-a="unzip">📦 Extract Here</div>
      <div class="cs"></div>
      <div class="ci" data-a="copy">📋 Copy Path</div>
      <div class="cs"></div>
      <div class="ci dng" data-a="delete">🗑 Delete</div>
    </div>

    <!-- INPUT MODAL -->
    <div class="mo hid" id="moInput">
      <div class="md sm">
        <div class="mh"><h3 id="moInTitle">Enter Name</h3><button class="mc" data-mo="moInput">✕</button></div>
        <div class="mb">
          <input type="text" class="mi" id="moInField" placeholder="">
          <p class="mhint" id="moInHint"></p>
        </div>
        <div class="mf">
          <button class="btn ghost sm" data-mo="moInput">Cancel</button>
          <button class="btn pri sm" id="moInOk">Confirm</button>
        </div>
      </div>
    </div>

    <!-- EDITOR MODAL -->
    <div class="mo hid" id="moEditor">
      <div class="md xl">
        <div class="mh">
          <h3 id="edTitle">Edit File</h3>
          <div class="mh-acts">
            <span class="el-lang" id="edLang"></span>
            <button class="btn pri sm" id="edSave">💾 Save</button>
            <button class="mc" data-mo="moEditor">✕</button>
          </div>
        </div>
        <div class="mb full"><textarea id="editorArea" spellcheck="false" autocomplete="off"></textarea></div>
      </div>
    </div>

    <!-- PREVIEW MODAL -->
    <div class="mo hid" id="moPreview">
      <div class="md xl">
        <div class="mh">
          <h3 id="prevTitle">Preview</h3>
          <div class="mh-acts">
            <button class="btn sm" id="prevDl">⬇ Download</button>
            <button class="mc" data-mo="moPreview">✕</button>
          </div>
        </div>
        <div class="mb full"><div id="prevContent"></div></div>
      </div>
    </div>

    <!-- DETAILS MODAL -->
    <div class="mo hid" id="moDetails">
      <div class="md sm">
        <div class="mh"><h3>File Details</h3><button class="mc" data-mo="moDetails">✕</button></div>
        <div class="mb"><table class="dt" id="dtTable"></table></div>
      </div>
    </div>

    <!-- TOASTS -->
    <div class="tc" id="tc"></div>

<?php endif; ?>

<script>
<?php if ($loggedIn): ?>
    'use strict';
    // ════════════════════════════════════════════════
    //  CONFIG
    // ════════════════════════════════════════════════
    const ME = <?= json_encode($me) ?>;          // this PHP file's name
    const API = `${ME}?api=`;
    const MAX_MB = <?= MAX_UPLOAD_MB ?>;

    // ════════════════════════════════════════════════
    //  STATE
    // ════════════════════════════════════════════════
    const S = {
        path: '',        // current dir
        items: [],       // current listing
        sel: new Set(),  // selected paths
        view: 'list',    // list | grid
        dark: true,
        ctxItem: null,
        dragN: 0,
    };

    // ════════════════════════════════════════════════
    //  API HELPER
    // ════════════════════════════════════════════════
    async function api(action, body = {}) {
        const fd = new FormData();
        Object.entries(body).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach(i => fd.append(k + '[]', i));
            else fd.append(k, v ?? '');
        });
        const r = await fetch(API + encodeURIComponent(action), { method: 'POST', body: fd });
        const j = await r.json();
        if (!j.ok) throw new Error(j.e || 'Error');
        return j.d;
    }

    // ════════════════════════════════════════════════
    //  TOAST
    // ════════════════════════════════════════════════
    const TICO = { ok: '✓', err: '✕', inf: 'ℹ', wrn: '⚠' };
    function toast(title, msg = '', type = 'inf', ms = 3400) {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<span class="t-ico">${TICO[type]||'ℹ'}</span>
        <div class="t-bd"><div class="t-ttl">${esc(title)}</div>${msg ? `<div class="t-msg">${esc(msg)}</div>` : ''}</div>`;
        document.getElementById('tc').appendChild(el);
        setTimeout(() => { el.classList.add('out'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, ms);
    }

    // ════════════════════════════════════════════════
    //  TREE
    // ════════════════════════════════════════════════
    async function loadTree() {
        const t = document.getElementById('fileTree');
        t.innerHTML = '<div style="padding:14px;color:var(--tx3);font-size:13px">Loading…</div>';
        try {
            const d = await api('tree', { path: '' });
            t.innerHTML = '';
            const root = mkRow('🏠', 'Root', '');
            root.classList.toggle('act', S.path === '');
            root.addEventListener('click', () => nav(''));
            t.appendChild(root);
            if (d.tree?.length) {
                const cc = document.createElement('div');
                cc.className = 'tree-ch';
                renderTree(d.tree, cc);
                t.appendChild(cc);
            }
        } catch(e) { t.innerHTML = `<div style="padding:14px;color:var(--rd);font-size:13px">${esc(e.message)}</div>`; }
    }

    function mkRow(icon, name, path) {
        const row = document.createElement('div');
        row.className = 'tree-row';
        row.dataset.path = path;
        row.innerHTML = `<span class="tr-arr emp">▶</span><span class="tr-ico">${icon}</span><span class="tr-nm">${esc(name)}</span>`;
        return row;
    }

    function renderTree(nodes, container) {
        nodes.forEach(n => {
            const w = document.createElement('div');
            const row = mkRow('📁', n.name, n.path);
            row.classList.toggle('act', S.path === n.path);
            const arr = row.querySelector('.tr-arr');
            let cc = null;
            if (n.ch?.length) {
                arr.classList.remove('emp');
                cc = document.createElement('div');
                cc.className = 'tree-ch hid';
                renderTree(n.ch, cc);
            }
            arr.addEventListener('click', e => {
                e.stopPropagation();
                if (!cc) return;
                const open = !cc.classList.contains('hid');
                cc.classList.toggle('hid', open);
                arr.classList.toggle('open', !open);
            });
            row.addEventListener('click', () => {
                nav(n.path);
                if (cc) { cc.classList.remove('hid'); arr.classList.add('open'); }
            });
            w.appendChild(row);
            if (cc) w.appendChild(cc);
            container.appendChild(w);
        });
    }

    function syncTree() {
        document.querySelectorAll('.tree-row').forEach(r => r.classList.toggle('act', r.dataset.path === S.path));
    }

    // ════════════════════════════════════════════════
    //  NAVIGATION
    // ════════════════════════════════════════════════
    async function nav(path) {
        S.path = path; S.sel.clear(); S.items = [];
        updateBc(path); syncTree(); updateBulk();
        await loadDir(path);
    }

    function updateBc(path) {
        const bc = document.getElementById('bc');
        bc.innerHTML = '';
        const parts = path ? path.split('/').filter(Boolean) : [];
        const addCrumb = (text, p, active) => {
            const s = document.createElement('span');
            s.className = 'crumb' + (active ? ' act' : '');
            s.textContent = text;
            s.dataset.path = p;
            if (!active) s.addEventListener('click', () => nav(p));
            bc.appendChild(s);
        };
        addCrumb('🏠 Root', '', parts.length === 0);
        let acc = '';
        parts.forEach((p, i) => {
            acc = acc ? acc + '/' + p : p;
            addCrumb(p, acc, i === parts.length - 1);
        });
    }

    async function loadDir(path) {
        const fl = document.getElementById('fl');
        fl.innerHTML = '<div class="spin-wrap"><div class="spin"></div><span>Loading…</span></div>';
        try {
            const d = await api('list', { path });
            S.items = d.items || [];
            render();
        } catch(e) {
            fl.innerHTML = `<div class="empty-st"><span class="ei">⚠</span><span class="et">${esc(e.message)}</span></div>`;
        }
    }

    // ════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════
    const ICONS = { folder:'📁',image:'🖼',video:'🎬',audio:'🎵',archive:'🗜',code:'📝',data:'📊',document:'📄',file:'📄',font:'🔤' };

    function render(items = S.items, isSearch = false) {
        const fl = document.getElementById('fl');
        fl.className = S.view === 'grid' ? 'fg' : 'fl';
        fl.innerHTML = '';

        if (isSearch) {
            const b = document.createElement('div');
            b.className = 'srb';
            b.innerHTML = `🔍 ${items.length} result(s) for "<strong>${esc(S.sq)}</strong>"
            <button class="btn ghost sm" id="clrSrch">Clear</button>`;
            fl.before(b);
            document.getElementById('clrSrch')?.addEventListener('click', () => nav(S.path));
        }

        if (!items.length) {
            fl.innerHTML = `<div class="empty-st"><span class="ei">📂</span>
            <span class="et">${isSearch ? 'No results' : 'Folder is empty'}</span>
            <span class="es">${isSearch ? 'Try different keywords' : 'Upload or create files'}</span></div>`;
            return;
        }
        if (S.view === 'list' && !isSearch) {
            const h = document.createElement('div');
            h.className = 'fl-hd';
            h.innerHTML = '<span></span><span>Name</span><span>Size</span><span>Modified</span><span>Type</span>';
            fl.appendChild(h);
        }
        items.forEach((item, i) => fl.appendChild(S.view === 'grid' ? mkGrid(item, i) : mkList(item, i)));
        updateIc();
    }

    function mkList(item, i) {
        const el = document.createElement('div');
        el.className = 'fi' + (item.isDir ? ' dir' : '');
        el.dataset.path = item.path; el.dataset.i = i;
        el.style.animationDelay = Math.min(i*.02,.3)+'s';
        el.classList.toggle('sel', S.sel.has(item.path));
        el.innerHTML = `
        <div class="fi-chk"><input type="checkbox" ${S.sel.has(item.path)?'checked':''} data-path="${esc(item.path)}"></div>
        <div class="fi-nm"><span class="f-ico">${ICONS[item.cat]||'📄'}</span><span class="f-nm" title="${esc(item.name)}">${esc(item.name)}</span></div>
        <div class="f-sz">${item.isDir?'—':item.sizeH}</div>
        <div class="f-mod">${fmtDate(item.mod)}</div>
        <div class="f-tp"><span class="badge">${esc(item.ext||(item.isDir?'folder':'file'))}</span></div>`;
        el.querySelector('input').addEventListener('change', e => { e.stopPropagation(); toggleSel(item.path, el); });
        el.addEventListener('click', e => {
            if (e.target.type === 'checkbox') return;
            if (e.ctrlKey||e.metaKey) { toggleSel(item.path, el); return; }
            if (e.shiftKey) { rangeSel(i); return; }
            if (item.isDir) nav(item.path);
        });
        el.addEventListener('dblclick', e => { if(e.target.type==='checkbox') return; dblClick(item); });
        el.addEventListener('contextmenu', e => { e.preventDefault(); ctxOpen(e, item); });
        return el;
    }

    function mkGrid(item, i) {
        const el = document.createElement('div');
        el.className = 'fgi' + (item.isDir ? ' dir' : '');
        el.dataset.path = item.path; el.dataset.i = i;
        el.style.animationDelay = Math.min(i*.03,.4)+'s';
        el.classList.toggle('sel', S.sel.has(item.path));
        el.innerHTML = `
        <label class="g-chk"><input type="checkbox" ${S.sel.has(item.path)?'checked':''}></label>
        <span class="f-ico">${ICONS[item.cat]||'📄'}</span>
        <span class="f-nm" title="${esc(item.name)}">${esc(item.name)}</span>
        <span class="f-sz">${item.isDir?'':item.sizeH}</span>`;
        el.querySelector('input').addEventListener('change', e => { e.stopPropagation(); toggleSel(item.path, el); });
        el.addEventListener('click', e => {
            if (e.target.type==='checkbox'||e.target.tagName==='LABEL') return;
            if (e.ctrlKey||e.metaKey) { toggleSel(item.path, el); return; }
            if (item.isDir) nav(item.path);
        });
        el.addEventListener('dblclick', e => { if(e.target.type==='checkbox'||e.target.tagName==='LABEL') return; dblClick(item); });
        el.addEventListener('contextmenu', e => { e.preventDefault(); ctxOpen(e, item); });
        return el;
    }

    function dblClick(item) {
        if (item.isDir) return nav(item.path);
        if (item.cat === 'image') openPreview(item);
        else if (['archive','video','audio','font'].includes(item.cat)) download(item);
        else openEditor(item);
    }

    // ════════════════════════════════════════════════
    //  SELECTION
    // ════════════════════════════════════════════════
    function toggleSel(path, el) {
        S.sel.has(path) ? S.sel.delete(path) : S.sel.add(path);
        el.classList.toggle('sel', S.sel.has(path));
        el.querySelector('input[type=checkbox]').checked = S.sel.has(path);
        updateBulk();
    }
    function rangeSel(toI) {
        document.querySelectorAll('.fi,.fgi').forEach((el, i) => {
            if (i <= toI) { const p = el.dataset.path; S.sel.add(p); el.classList.add('sel'); const cb=el.querySelector('input[type=checkbox]'); if(cb) cb.checked=true; }
        });
        updateBulk();
    }
    function clearSel() {
        S.sel.clear();
        document.querySelectorAll('.fi.sel,.fgi.sel').forEach(el => {
            el.classList.remove('sel');
            const cb = el.querySelector('input[type=checkbox]'); if(cb) cb.checked=false;
        });
        updateBulk();
    }
    function updateBulk() {
        const n = S.sel.size;
        document.getElementById('btnBulkDel').classList.toggle('hid', n===0);
        document.getElementById('btnBulkZip').classList.toggle('hid', n===0);
        if (n>0) { document.getElementById('btnBulkDel').textContent=`🗑 Delete (${n})`; document.getElementById('btnBulkZip').textContent=`🗜 Zip (${n})`; }
        updateIc();
    }
    function updateIc() {
        const n=S.items.length, s=S.sel.size;
        document.getElementById('ic').textContent = s>0 ? `${s} of ${n} selected` : `${n} item${n!==1?'s':''}`;
    }

    // ════════════════════════════════════════════════
    //  CONTEXT MENU
    // ════════════════════════════════════════════════
    function ctxOpen(e, item) {
        S.ctxItem = item;
        const ctx = document.getElementById('ctx');
        ctx.classList.remove('hid');
        const x = Math.min(e.clientX, innerWidth-190), y = Math.min(e.clientY, innerHeight-240);
        ctx.style.left = x+'px'; ctx.style.top = y+'px';
        ctx.querySelector('[data-a=open]').style.display = item.isDir ? '' : 'none';
        ctx.querySelector('[data-a=edit]').style.display = (!item.isDir && item.cat!=='image') ? '' : 'none';
        ctx.querySelector('[data-a=download]').style.display = item.isDir ? 'none' : '';
        ctx.querySelector('[data-a=unzip]').style.display = item.ext==='zip' ? '' : 'none';
    }
    function ctxClose() { document.getElementById('ctx').classList.add('hid'); S.ctxItem=null; }

    document.getElementById('ctx').addEventListener('click', async e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (!a || !S.ctxItem) return;
        const item = S.ctxItem; ctxClose();
        if (a==='open') nav(item.path);
        else if (a==='download') download(item);
        else if (a==='edit') openEditor(item);
        else if (a==='rename') promptRename(item);
        else if (a==='delete') confirmDel([item.path]);
        else if (a==='zip') await doZip([item.path], S.path, item.name+'.zip');
        else if (a==='unzip') await doUnzip(item);
        else if (a==='copy') { navigator.clipboard.writeText('/'+item.path); toast('Copied','Path copied','inf'); }
    });
    document.addEventListener('click', e => { if (!document.getElementById('ctx').contains(e.target)) ctxClose(); });

    // ════════════════════════════════════════════════
    //  FILE OPS
    // ════════════════════════════════════════════════
    document.getElementById('btnMkdir').addEventListener('click', () => {
        inputModal('New Folder','Folder name','my-folder', async n => {
            try { await api('mkdir',{path:S.path,name:n}); toast('Created',`"${n}" created`,'ok'); await loadDir(S.path); await loadTree(); }
            catch(e) { toast('Error',e.message,'err'); }
        });
    });

    document.getElementById('btnTouch').addEventListener('click', () => {
        inputModal('New File','File name','untitled.txt', async n => {
            try { await api('touch',{path:S.path,name:n}); toast('Created',`"${n}" created`,'ok'); await loadDir(S.path); }
            catch(e) { toast('Error',e.message,'err'); }
        });
    });

    function promptRename(item) {
        inputModal('Rename','New name',item.name, async n => {
            if (n===item.name) return;
            try { await api('rename',{path:item.path,name:n}); toast('Renamed',`"${item.name}" → "${n}"`,'ok'); await loadDir(S.path); await loadTree(); }
            catch(e) { toast('Error',e.message,'err'); }
        });
    }

    function confirmDel(paths) {
        const names = paths.map(p=>p.split('/').pop()).join(', ');
        if (!confirm(`Delete ${paths.length===1?`"${names}"`:paths.length+' items'}?\nThis cannot be undone.`)) return;
        doDel(paths);
    }
    async function doDel(paths) {
        try {
            const d = await api('delete',{paths});
            toast('Deleted',`${d.del.length} item(s) deleted`,'ok');
            if(d.err?.length) toast('Partial errors',d.err.join(', '),'wrn');
            S.sel.clear(); await loadDir(S.path); await loadTree(); updateBulk();
        } catch(e) { toast('Error',e.message,'err'); }
    }

    document.getElementById('btnBulkDel').addEventListener('click', () => confirmDel([...S.sel]));
    document.getElementById('btnBulkZip').addEventListener('click', () => {
        inputModal('Zip Archive','Archive name','archive.zip', async n => doZip([...S.sel],S.path,n));
    });

    async function doZip(paths, dest, name) {
        try { toast('Compressing…','','inf',1400); await api('zip',{paths,path:dest,name}); toast('Compressed',`"${name}" created`,'ok'); await loadDir(S.path); }
        catch(e) { toast('Error',e.message,'err'); }
    }
    async function doUnzip(item) {
        try { toast('Extracting…','','inf',1400); const d=await api('unzip',{path:item.path}); toast('Extracted',`Contents → "${d.path}"`,'ok'); await loadDir(S.path); await loadTree(); }
        catch(e) { toast('Error',e.message,'err'); }
    }

    function download(item) {
        const f = document.createElement('form');
        f.method='POST'; f.action=API+'download'; f.style.display='none';
        const i = document.createElement('input'); i.name='path'; i.value=item.path;
        f.appendChild(i); document.body.appendChild(f); f.submit(); document.body.removeChild(f);
    }

    // ════════════════════════════════════════════════
    //  UPLOAD
    // ════════════════════════════════════════════════
    document.getElementById('btnUpload').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', e => { if(e.target.files.length) doUpload(e.target.files); e.target.value=''; });

    async function doUpload(files) {
        const max = MAX_MB*1024*1024;
        const valid = [...files].filter(f => { if(f.size>max){toast('Skipped',`${f.name} > ${MAX_MB}MB`,'wrn');return false;} return true; });
        if (!valid.length) return;
        showUpb(0, `Uploading ${valid.length} file(s)…`);
        const fd = new FormData();
        fd.append('action','upload'); fd.append('path',S.path);
        valid.forEach(f => fd.append('files[]',f));
        const xhr = new XMLHttpRequest();
        xhr.open('POST', ME);
        xhr.upload.addEventListener('progress', e => { if(e.lengthComputable) showUpb(Math.round(e.loaded/e.total*100),`Uploading… ${Math.round(e.loaded/e.total*100)}%`); });
        xhr.addEventListener('load', async () => {
            hideUpb();
            try {
                const j=JSON.parse(xhr.responseText);
                if(!j.ok) throw new Error(j.e);
                toast('Uploaded',`${j.d.up.length} file(s) uploaded`,'ok');
                if(j.d.err?.length) toast('Some failed',j.d.err.join(', '),'wrn');
                await loadDir(S.path);
            } catch(e) { toast('Upload error',e.message,'err'); }
        });
        xhr.addEventListener('error', () => { hideUpb(); toast('Upload failed','Network error','err'); });
        xhr.send(fd);
    }

    function showUpb(pct, txt) {
        document.getElementById('upb').classList.remove('hid');
        document.getElementById('upbBar').style.setProperty('--p', pct+'%');
        document.getElementById('upbTxt').textContent = txt;
    }
    function hideUpb() { document.getElementById('upb').classList.add('hid'); }

    // ── Drag & Drop ──────────────────────────────
    const fa = document.getElementById('fa'), dropOv = document.getElementById('dropOv');
    ['dragenter','dragover','dragleave','drop'].forEach(ev => fa.addEventListener(ev, e=>{e.preventDefault();e.stopPropagation();}));
    fa.addEventListener('dragenter', () => { S.dragN++; dropOv.classList.remove('hid'); });
    fa.addEventListener('dragleave', () => { if(--S.dragN<=0){S.dragN=0;dropOv.classList.add('hid');} });
    fa.addEventListener('drop', e => { S.dragN=0; dropOv.classList.add('hid'); if(e.dataTransfer.files.length) doUpload(e.dataTransfer.files); });

    // ════════════════════════════════════════════════
    //  EDITOR
    // ════════════════════════════════════════════════
    async function openEditor(item) {
        try {
            const d = await api('read',{path:item.path});
            document.getElementById('edTitle').textContent = '✏ '+item.name;
            document.getElementById('edLang').textContent = item.ext||'text';
            document.getElementById('editorArea').value = d.content;
            document.getElementById('moEditor').classList.remove('hid');
            document.getElementById('editorArea').focus();
            document.getElementById('edSave').onclick = async () => {
                try { await api('write',{path:item.path,content:document.getElementById('editorArea').value}); toast('Saved',item.name+' saved','ok'); await loadDir(S.path); }
                catch(e) { toast('Save failed',e.message,'err'); }
            };
        } catch(e) { toast('Cannot open',e.message,'err'); }
    }

    document.getElementById('editorArea').addEventListener('keydown', e => {
        if ((e.ctrlKey||e.metaKey)&&e.key==='s') { e.preventDefault(); document.getElementById('edSave').click(); }
        if (e.key==='Tab') { e.preventDefault(); const t=e.target,s=t.selectionStart; t.value=t.value.slice(0,s)+'  '+t.value.slice(t.selectionEnd); t.selectionStart=t.selectionEnd=s+2; }
    });

    // ════════════════════════════════════════════════
    //  PREVIEW
    // ════════════════════════════════════════════════
    async function openPreview(item) {
        document.getElementById('prevTitle').textContent = item.name;
        document.getElementById('prevContent').innerHTML = '<div class="spin-wrap"><div class="spin"></div><span>Loading…</span></div>';
        document.getElementById('moPreview').classList.remove('hid');
        document.getElementById('prevDl').onclick = e => { e.preventDefault(); download(item); };
        if (item.cat==='image') {
            const img=document.createElement('img');
            img.src=`${ME}?api=download&path=${encodeURIComponent(item.path)}`;
            img.onload=()=>{ document.getElementById('prevContent').innerHTML=''; document.getElementById('prevContent').appendChild(img); };
            img.onerror=()=>{ document.getElementById('prevContent').innerHTML='<div class="empty-st"><span>Failed to load</span></div>'; };
        } else {
            try { const d=await api('read',{path:item.path}); document.getElementById('prevContent').innerHTML=`<pre>${esc(d.content)}</pre>`; }
            catch(e) { document.getElementById('prevContent').innerHTML=`<div class="empty-st"><span>${esc(e.message)}</span></div>`; }
        }
    }

    // ════════════════════════════════════════════════
    //  SEARCH
    // ════════════════════════════════════════════════
    let sTimer = null;
    Object.assign(S, { sq: '' });
    const swIn = document.getElementById('searchInput'), swClr = document.getElementById('swClr');
    swIn.addEventListener('input', () => {
        const q = swIn.value.trim();
        swClr.classList.toggle('vis', q.length>0);
        clearTimeout(sTimer);
        if (!q) { render(); return; }
        sTimer = setTimeout(() => doSearch(q), 350);
    });
    swClr.addEventListener('click', () => { swIn.value=''; swClr.classList.remove('vis'); S.sq=''; render(); });

    async function doSearch(q) {
        S.sq = q;
        document.getElementById('fl').innerHTML = '<div class="spin-wrap"><div class="spin"></div><span>Searching…</span></div>';
        try { const d=await api('search',{query:q,path:S.path}); document.getElementById('ic').textContent=d.results.length+' result(s)'; render(d.results,true); }
        catch(e) { document.getElementById('fl').innerHTML=`<div class="empty-st"><span class="ei">⚠</span><span class="et">${esc(e.message)}</span></div>`; }
    }

    // ════════════════════════════════════════════════
    //  MODALS
    // ════════════════════════════════════════════════
    function inputModal(title, hint, placeholder, cb) {
        document.getElementById('moInTitle').textContent = title;
        document.getElementById('moInHint').textContent = hint;
        const f = document.getElementById('moInField');
        f.placeholder = placeholder; f.value = '';
        document.getElementById('moInput').classList.remove('hid');
        setTimeout(() => { f.focus(); f.select(); }, 40);
        document.getElementById('moInOk').onclick = () => {
            const v = f.value.trim(); if (!v) { f.focus(); return; }
            document.getElementById('moInput').classList.add('hid'); cb(v);
        };
        f.onkeydown = e => {
            if (e.key==='Enter') document.getElementById('moInOk').click();
            if (e.key==='Escape') document.getElementById('moInput').classList.add('hid');
        };
    }

    document.querySelectorAll('.mc,[data-mo]').forEach(b => {
        const id = b.dataset.mo || b.closest('.mo')?.id;
        b.addEventListener('click', () => { if(id) document.getElementById(id)?.classList.add('hid'); });
    });
    document.querySelectorAll('.mo').forEach(o => {
        o.addEventListener('click', e => { if(e.target===o) o.classList.add('hid'); });
    });
    document.addEventListener('keydown', e => {
        if (e.key==='Escape') { document.querySelectorAll('.mo:not(.hid)').forEach(m=>m.classList.add('hid')); ctxClose(); }
        if (e.key==='Delete'&&S.sel.size>0&&!document.querySelector('.mo:not(.hid)')) confirmDel([...S.sel]);
        if (e.key==='F2'&&S.sel.size===1) { const p=[...S.sel][0]; const item=S.items.find(i=>i.path===p); if(item) promptRename(item); }
    });

    // ════════════════════════════════════════════════
    //  VIEW TOGGLE
    // ════════════════════════════════════════════════
    document.getElementById('vList').addEventListener('click', () => { S.view='list'; document.getElementById('vList').classList.add('act'); document.getElementById('vGrid').classList.remove('act'); render(); });
    document.getElementById('vGrid').addEventListener('click', () => { S.view='grid'; document.getElementById('vGrid').classList.add('act'); document.getElementById('vList').classList.remove('act'); render(); });

    // ════════════════════════════════════════════════
    //  THEME + SIDEBAR
    // ════════════════════════════════════════════════
    document.getElementById('themeBtn').addEventListener('click', () => {
        S.dark = !S.dark;
        document.documentElement.dataset.theme = S.dark ? 'dark' : 'light';
        document.getElementById('themeBtn').textContent = S.dark ? '🌙' : '☀';
        localStorage.setItem('nf_theme', S.dark ? 'dark' : 'light');
    });
    document.getElementById('sbToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('col'));
    document.getElementById('refreshTree').addEventListener('click', loadTree);

    // ════════════════════════════════════════════════
    //  UTILS
    // ════════════════════════════════════════════════
    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function fmtDate(ts) {
        const d = new Date(ts*1000), now = new Date();
        const diff = Math.floor((now-d)/86400000);
        if (diff===0) return 'Today '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        if (diff===1) return 'Yesterday';
        if (diff<7) return diff+'d ago';
        return d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});
    }

    // ════════════════════════════════════════════════
    //  BOOT
    // ════════════════════════════════════════════════
    (async () => {
        const t = localStorage.getItem('nf_theme') || 'dark';
        S.dark = t === 'dark';
        document.documentElement.dataset.theme = t;
        document.getElementById('themeBtn').textContent = S.dark ? '🌙' : '☀';
        await Promise.all([loadTree(), nav('')]);
    })();

<?php endif; ?>
</script>
</body>
</html>