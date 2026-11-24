<?php

/**
 * Browser integration-test fixture for smolFrame.
 * Served by Playwright's existing PHP development server.
 */

if (isset($_GET['error'])) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Intentional test error';
    exit;
}

if (isset($_GET['redirect'])) {
    http_response_code(204);
    if ($_GET['redirect'] !== 'missing-header') {
        header('X-Redirect-URL: /tests/fixture.php?page=redirected');
    }
    exit;
}

if (isset($_GET['source'])) {
    header('X-Source-Frame: remote');
}
if (isset($_GET['target'])) {
    header('X-Target-Frame: ' . ($_GET['target'] === 'invalid' ? 'does-not-exist' : 'aux'));
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$page = h((string) ($_POST['page'] ?? $_GET['page'] ?? 'initial'));
$method = h($_SERVER['REQUEST_METHOD']);
$requestedFrame = h($_SERVER['HTTP_X_SMOL_FRAME'] ?? 'none');
$missing = isset($_GET['missing']);
$stateless = isset($_GET['stateless']);
$hideMissing = isset($_GET['hide']);
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Test page: <?= $page ?></title>
    <script defer src="/src/smolFrame.js"></script>
</head>

<body>
    <div id="synced" data-frame-sync>Synced: <?= $page ?></div>

    <?php if (!$missing): ?>
        <section id="main" data-frame data-frame-target="_frame" <?= $stateless ? ' data-frame-stateless' : '' ?><?= $hideMissing ? ' data-frame-hide-missing' : '' ?>>
            <p id="value"><?= $page ?></p>
            <p id="method"><?= $method ?></p>
            <p id="request-frame"><?= $requestedFrame ?></p>

            <a href="/tests/fixture.php?page=next">Next</a>
            <a href="/tests/fixture.php?page=second">Second</a>
            <a href="/tests/fixture.php?redirect=1">Redirect</a>
            <a href="/tests/fixture.php?redirect=missing-header">Bad redirect</a>
            <a href="/tests/fixture.php?error=1">Server error</a>
            <a href="/tests/fixture.php?missing=1">Missing frame</a>
            <a href="/tests/fixture.php?source=1&page=from-source">Source override</a>
            <a href="/tests/fixture.php?target=aux&page=from-target">Target override</a>
            <a href="/tests/fixture.php?target=invalid&page=invalid-target">Invalid target</a>
            <a href="/tests/fixture.php?page=aux-link" data-frame-target="aux">Target auxiliary</a>
            <a href="/tests/fixture.php?page=native" data-frame-target="_top">Native top</a>
            <a href="/tests/fixture.php?page=popup" target="_blank">Native blank</a>
            <a href="http://localhost:8765/tests/fixture.php?page=external">Other origin</a>

            <form method="get" action="/tests/fixture.php">
                <input name="page" value="submitted" required>
                <button type="submit">Submit GET</button>
                <button type="submit" formmethod="post" name="submitter" value="override">Submit POST override</button>
            </form>
            <form method="post" action="/tests/fixture.php">
                <input name="page" value="posted">
                <button type="submit">Submit POST</button>
            </form>
        </section>
    <?php endif; ?>

    <section id="aux" data-frame>
        <p id="aux-value">aux initial</p>
    </section>
    <section id="remote">
        <p id="remote-value"><?= $page ?></p>
    </section>

    <a id="ordinary-link" href="/tests/fixture.php?page=ordinary">Ordinary link</a>
</body>

</html>