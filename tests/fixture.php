<?php

if (isset($_GET['redirect'])) {
    http_response_code(204);
    header('X-Redirect-URL: /tests/fixture.php?page=redirected');
    exit;
}

$value = htmlspecialchars(
    $_GET['page'] ?? 'initial',
    ENT_QUOTES,
    'UTF-8'
);
?>
<!doctype html>
<html>

<head>
    <meta charset="utf-8">
    <title>smolFrame test</title>
    <script defer src="/src/smolFrame.js"></script>
</head>

<body>
    <section id="main" data-frame data-frame-target="_frame">
        <p id="value"><?= $value ?></p>

        <a href="/tests/fixture.php?page=next">Next</a>
        <a href="/tests/fixture.php?redirect=1">Redirect</a>

        <form method="get" action="/tests/fixture.php">
            <input name="page" value="submitted">
            <button type="submit">Submit</button>
        </form>
    </section>
</body>

</html>