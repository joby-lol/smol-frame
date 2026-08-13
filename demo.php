<?php

include __DIR__ . '/vendor/autoload.php';

use Joby\Smol\Frame\SmolFrame;

// if x-smol-frame header is set, delay 1s
if (@$_SERVER['HTTP_X_SMOL_FRAME'])
    sleep(1);

// if x-smol-frame header is always-errors, send a server error
if (@$_SERVER['HTTP_X_SMOL_FRAME'] == 'always-errors') {
    http_response_code(500);
    exit;
}

?>
<!DOCTYPE html>
<html>

<head>
    <title>smolFrame demo</title>
    <script>
        <?php echo SmolFrame::scriptContent(); ?>
    </script>
    <style>
        <?php echo SmolFrame::cssContent(); ?>
    </style>
</head>

<body>

    <h1>smolFrame demo page</h1>
    <p>
        This page demonstrates most of the features of smolFrame. It automatically adds a 1s delay to all frame responses, so that you can see some visual feedback even on frame updates.
    </p>

    <div id="frame-synced" data-frame-sync>
        This section should update on all stateful updates. This feature is useful for things like breadcrumbs, context menus, etc.<br>
        Last request: <?php echo @$_SERVER['HTTP_X_SMOL_FRAME']; ?><br>
        Random int: <?php echo random_int(1000, 9999); ?>
    </div>

    <div id="basic-link-demo" data-frame data-frame-stateless>
        <h2>Basic links</h2>
        <p>
            Links may load in <a href="/" data-frame-target="_frame">the current top frame</a>, <a href="/" data-frame-target="demo-frame__some-other-frame">some other frame</a>, or <a href="/">the whole page, like a normal link</a>.
        </p>
        <p data-frame id="demo-frame__some-other-frame">
            Random number: <?php echo random_int(1000, 9999); ?><br>
            This section may refresh either alone or as part of the entire parent frame.
        </p>
    </div>

    <div id="stateful-demo" data-frame data-frame-target="_frame">
        <h2>Stateful frames</h2>
        <p>
            Stateful frames update the URL and browser back/forward state tracking. This allows refreshing the entire page to work properly.
        </p>
        <p>
            Current position: <?php

            $x = (int) @$_GET['x'] ?? 0;
            $y = (int) @$_GET['y'] ?? 0;
            printf('<strong>%s, %s</strong>', $x, $y);
            ?>
        </p>
        <p>
            <a href="<?php printf('?x=%s&y=%s', $x - 1, $y); ?>">go left</a> |
            <a href="<?php printf('?x=%s&y=%s', $x + 1, $y); ?>">go right</a> |
            <a href="<?php printf('?x=%s&y=%s', $x, $y + 1); ?>">go up</a> |
            <a href="<?php printf('?x=%s&y=%s', $x, $y - 1); ?>">go down</a> |
        </p>
    </div>

    <div id="get-form-demo" data-frame data-frame-target="_frame">
        <h2>GET forms</h2>
        <p>Submitted data: <?php echo json_encode($_GET); ?></p>
        <form method="get">
            <input type="text" name="field">
            <input type="submit" name="button">
        </form>
    </div>

    <div id="post-form-demo" data-frame data-frame-target="_frame">
        <h2>POST forms</h2>
        <p>Submitted data: <?php echo json_encode($_POST); ?></p>
        <form method="post">
            <input type="text" name="field">
            <input type="submit" name="button">
        </form>
    </div>

    <div>
        <h2>Error handling</h2>
        <p>
            Frames that encounter an error response will turn red and display some error information. For example, <a href="/" data-frame-target="always-errors">this link always loads an error in the frame below</a>.
        </p>
        <div data-frame id="always-errors">
            [this frame will always generate an error when it reloads]
        </div>
    </div>

</body>

</html>