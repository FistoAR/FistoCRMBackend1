<?php
/*
=========================================================
 ADVANCED SINGLE FILE PHP FILE MANAGER
 FileZilla + VSCode + cPanel Inspired
=========================================================
 Features:
 - File Explorer
 - Upload / Download
 - Drag Drop Upload
 - Create File / Folder
 - Rename / Delete
 - ZIP Extract / Compress
 - Monaco Editor
 - AJAX APIs
 - Context Menu
 - Dark UI
=========================================================
*/

session_start();

// =========================================================
// CONFIG
// =========================================================

$ROOT_PATH = __DIR__;
$CURRENT_PATH = isset($_GET['path']) ? realpath($_GET['path']) : $ROOT_PATH;

if (!$CURRENT_PATH || strpos($CURRENT_PATH, $ROOT_PATH) !== 0) {
    $CURRENT_PATH = $ROOT_PATH;
}

// =========================================================
// HELPERS
// =========================================================

function jsonResponse($data)
{
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function safePath($path, $root)
{
    $real = realpath($path);

    if (!$real || strpos($real, $root) !== 0) {
        return false;
    }

    return $real;
}

function formatBytes($size)
{
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];

    for ($i = 0; $size > 1024; $i++) {
        $size /= 1024;
    }

    return round($size, 2) . ' ' . $units[$i];
}

function deleteRecursive($path)
{
    if (is_dir($path)) {
        $files = array_diff(scandir($path), ['.', '..']);

        foreach ($files as $file) {
            deleteRecursive($path . '/' . $file);
        }

        rmdir($path);
    } else {
        unlink($path);
    }
}

// =========================================================
// AJAX API
// =========================================================

if (isset($_POST['action'])) {

    $action = $_POST['action'];

    // =====================================================
    // CREATE FILE
    // =====================================================

    if ($action === 'create_file') {

        $name = trim($_POST['name']);
        $path = $CURRENT_PATH . '/' . $name;

        file_put_contents($path, '');

        jsonResponse([
            'success' => true,
            'message' => 'File Created'
        ]);
    }

    // =====================================================
    // CREATE FOLDER
    // =====================================================

    if ($action === 'create_folder') {

        $name = trim($_POST['name']);
        mkdir($CURRENT_PATH . '/' . $name);

        jsonResponse([
            'success' => true,
            'message' => 'Folder Created'
        ]);
    }

    // =====================================================
    // DELETE
    // =====================================================

    if ($action === 'delete') {

        $target = safePath($_POST['target'], $ROOT_PATH);

        if (!$target) {
            jsonResponse(['success' => false]);
        }

        deleteRecursive($target);

        jsonResponse([
            'success' => true,
            'message' => 'Deleted Successfully'
        ]);
    }

    // =====================================================
    // RENAME
    // =====================================================

    if ($action === 'rename') {

        $old = safePath($_POST['old'], $ROOT_PATH);
        $newName = trim($_POST['new_name']);

        $new = dirname($old) . '/' . $newName;

        rename($old, $new);

        jsonResponse([
            'success' => true,
            'message' => 'Renamed Successfully'
        ]);
    }

    // =====================================================
    // SAVE FILE
    // =====================================================

    if ($action === 'save_file') {

        $file = safePath($_POST['file'], $ROOT_PATH);
        $content = $_POST['content'];

        file_put_contents($file, $content);

        jsonResponse([
            'success' => true,
            'message' => 'Saved Successfully'
        ]);
    }

    // =====================================================
    // UPLOAD
    // =====================================================

    if ($action === 'upload') {

        if (!empty($_FILES['file'])) {

            $target = $CURRENT_PATH . '/' . basename($_FILES['file']['name']);

            move_uploaded_file($_FILES['file']['tmp_name'], $target);

            jsonResponse([
                'success' => true,
                'message' => 'Upload Successful'
            ]);
        }
    }

    // =====================================================
    // ZIP COMPRESS
    // =====================================================

    if ($action === 'compress') {

        $source = safePath($_POST['target'], $ROOT_PATH);

        $zipName = basename($source) . '.zip';
        $zipPath = dirname($source) . '/' . $zipName;

        $zip = new ZipArchive();

        if ($zip->open($zipPath, ZipArchive::CREATE) === true) {

            if (is_file($source)) {
                $zip->addFile($source, basename($source));
            }

            if (is_dir($source)) {

                $files = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($source),
                    RecursiveIteratorIterator::LEAVES_ONLY
                );

                foreach ($files as $name => $file) {

                    if (!$file->isDir()) {

                        $filePath = $file->getRealPath();
                        $relativePath = substr($filePath, strlen($source) + 1);

                        $zip->addFile($filePath, $relativePath);
                    }
                }
            }

            $zip->close();
        }

        jsonResponse([
            'success' => true,
            'message' => 'Compressed Successfully'
        ]);
    }

    // =====================================================
    // EXTRACT ZIP
    // =====================================================

    if ($action === 'extract') {

        $zipFile = safePath($_POST['target'], $ROOT_PATH);

        $zip = new ZipArchive();

        if ($zip->open($zipFile) === true) {
            $zip->extractTo(dirname($zipFile));
            $zip->close();
        }

        jsonResponse([
            'success' => true,
            'message' => 'Extracted Successfully'
        ]);
    }
}

// =========================================================
// FILE LIST
// =========================================================

$files = scandir($CURRENT_PATH);

?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PHP File Manager</title>

<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.8/axios.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs/loader.min.js"></script>

<style>
body {
    background: #0f172a;
    color: white;
    font-family: Arial;
}

.scrollbar::-webkit-scrollbar {
    width: 8px;
}

.scrollbar::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 20px;
}

.context-menu {
    position: fixed;
    background: #1e293b;
    border: 1px solid #334155;
    display: none;
    z-index: 999;
    min-width: 180px;
}

.context-menu button {
    width: 100%;
    text-align: left;
    padding: 10px;
}

.context-menu button:hover {
    background: #334155;
}
</style>
</head>
<body>

<div class="flex h-screen overflow-hidden">

    <!-- SIDEBAR -->
    <div class="w-72 bg-slate-900 border-r border-slate-700 p-4 overflow-y-auto scrollbar">

        <h1 class="text-2xl font-bold mb-6">PHP File Manager</h1>

        <div class="space-y-2">
            <button onclick="createFile()" class="w-full bg-blue-600 p-3 rounded-xl">New File</button>
            <button onclick="createFolder()" class="w-full bg-green-600 p-3 rounded-xl">New Folder</button>
        </div>

        <div class="mt-8">
            <h2 class="text-lg font-bold mb-3">Upload File</h2>

            <div class="bg-slate-800 p-4 rounded-xl">
                <input type="file" id="uploadInput" class="mb-3 w-full">
                <button onclick="uploadFile()" class="bg-purple-600 p-3 rounded-xl w-full">Upload</button>
            </div>
        </div>

    </div>

    <!-- MAIN -->
    <div class="flex-1 flex flex-col overflow-hidden">

        <!-- TOP -->
        <div class="bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center">
            <div>
                Current Path:
                <span class="text-blue-400"><?php echo htmlspecialchars($CURRENT_PATH); ?></span>
            </div>
        </div>

        <!-- FILE LIST -->
        <div class="flex-1 overflow-auto scrollbar p-4">

            <table class="w-full text-left">

                <thead>
                    <tr class="border-b border-slate-700">
                        <th class="p-3">Name</th>
                        <th class="p-3">Type</th>
                        <th class="p-3">Size</th>
                        <th class="p-3">Modified</th>
                        <th class="p-3">Actions</th>
                    </tr>
                </thead>

                <tbody>

                <?php foreach ($files as $file): ?>

                    <?php if ($file === '.') continue; ?>

                    <?php
                    $full = $CURRENT_PATH . '/' . $file;
                    ?>

                    <tr class="border-b border-slate-800 hover:bg-slate-800">

                        <td class="p-3">

                            <?php if (is_dir($full)): ?>

                                <a href="?path=<?php echo urlencode($full); ?>" class="text-yellow-400">
                                    📁 <?php echo htmlspecialchars($file); ?>
                                </a>

                            <?php else: ?>

                                <span onclick="openEditor('<?php echo addslashes($full); ?>')" class="cursor-pointer text-blue-400">
                                    📄 <?php echo htmlspecialchars($file); ?>
                                </span>

                            <?php endif; ?>

                        </td>

                        <td class="p-3">
                            <?php echo is_dir($full) ? 'Folder' : pathinfo($full, PATHINFO_EXTENSION); ?>
                        </td>

                        <td class="p-3">
                            <?php echo is_file($full) ? formatBytes(filesize($full)) : '-'; ?>
                        </td>

                        <td class="p-3">
                            <?php echo date('Y-m-d H:i', filemtime($full)); ?>
                        </td>

                        <td class="p-3 space-x-2">

                            <button onclick="renameItem('<?php echo addslashes($full); ?>')" class="bg-yellow-600 px-3 py-1 rounded-lg">
                                Rename
                            </button>

                            <button onclick="deleteItem('<?php echo addslashes($full); ?>')" class="bg-red-600 px-3 py-1 rounded-lg">
                                Delete
                            </button>

                            <button onclick="compressItem('<?php echo addslashes($full); ?>')" class="bg-purple-600 px-3 py-1 rounded-lg">
                                ZIP
                            </button>

                            <?php if (pathinfo($full, PATHINFO_EXTENSION) === 'zip'): ?>

                            <button onclick="extractItem('<?php echo addslashes($full); ?>')" class="bg-green-600 px-3 py-1 rounded-lg">
                                Extract
                            </button>

                            <?php endif; ?>

                        </td>
                    </tr>

                <?php endforeach; ?>

                </tbody>

            </table>

        </div>
    </div>
</div>

<!-- EDITOR MODAL -->
<div id="editorModal" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-50">

    <div class="w-[90%] h-[90%] bg-slate-900 rounded-2xl overflow-hidden flex flex-col">

        <div class="p-4 bg-slate-800 flex justify-between items-center">
            <h2 class="text-xl">Editor</h2>

            <div class="space-x-2">
                <button onclick="saveEditor()" class="bg-green-600 px-4 py-2 rounded-xl">Save</button>
                <button onclick="closeEditor()" class="bg-red-600 px-4 py-2 rounded-xl">Close</button>
            </div>
        </div>

        <div id="editor" class="flex-1"></div>

    </div>

</div>

<script>

let currentFile = null;
let editorInstance = null;

// =====================================================
// CREATE FILE
// =====================================================

async function createFile() {

    let name = prompt('Enter File Name');

    if (!name) return;

    let form = new FormData();
    form.append('action', 'create_file');
    form.append('name', name);

    await axios.post('', form);

    location.reload();
}

// =====================================================
// CREATE FOLDER
// =====================================================

async function createFolder() {

    let name = prompt('Enter Folder Name');

    if (!name) return;

    let form = new FormData();
    form.append('action', 'create_folder');
    form.append('name', name);

    await axios.post('', form);

    location.reload();
}

// =====================================================
// DELETE
// =====================================================

async function deleteItem(target) {

    if (!confirm('Delete Item?')) return;

    let form = new FormData();
    form.append('action', 'delete');
    form.append('target', target);

    await axios.post('', form);

    location.reload();
}

// =====================================================
// RENAME
// =====================================================

async function renameItem(target) {

    let name = prompt('Enter New Name');

    if (!name) return;

    let form = new FormData();
    form.append('action', 'rename');
    form.append('old', target);
    form.append('new_name', name);

    await axios.post('', form);

    location.reload();
}

// =====================================================
// UPLOAD
// =====================================================

async function uploadFile() {

    let file = document.getElementById('uploadInput').files[0];

    if (!file) return;

    let form = new FormData();

    form.append('action', 'upload');
    form.append('file', file);

    await axios.post('', form, {
        onUploadProgress: function(progressEvent) {
            console.log(progressEvent.loaded);
        }
    });

    location.reload();
}

// =====================================================
// COMPRESS
// =====================================================

async function compressItem(target) {

    let form = new FormData();
    form.append('action', 'compress');
    form.append('target', target);

    await axios.post('', form);

    location.reload();
}

// =====================================================
// EXTRACT
// =====================================================

async function extractItem(target) {

    let form = new FormData();
    form.append('action', 'extract');
    form.append('target', target);

    await axios.post('', form);

    location.reload();
}

// =====================================================
// EDITOR
// =====================================================

async function openEditor(file) {

    currentFile = file;

    let response = await axios.get(file);

    document.getElementById('editorModal').classList.remove('hidden');
    document.getElementById('editorModal').classList.add('flex');

    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs' }});

    require(['vs/editor/editor.main'], function () {

        if (editorInstance) {
            editorInstance.dispose();
        }

        editorInstance = monaco.editor.create(document.getElementById('editor'), {
            value: response.data,
            language: 'php',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: {
                enabled: true
            }
        });
    });
}

function closeEditor() {

    document.getElementById('editorModal').classList.add('hidden');
    document.getElementById('editorModal').classList.remove('flex');
}

// =====================================================
// SAVE EDITOR
// =====================================================

async function saveEditor() {

    let form = new FormData();

    form.append('action', 'save_file');
    form.append('file', currentFile);
    form.append('content', editorInstance.getValue());

    await axios.post('', form);

    alert('Saved Successfully');
}

</script>


</body>
</html>
