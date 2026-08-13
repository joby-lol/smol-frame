<?php

/**
 * smolFrame
 * https://github.com/joby-lol/smol-frame
 * (c) 2026 Joby Elliott code@joby.lol
 * MIT License https://opensource.org/licenses/MIT
 */

namespace Joby\Smol\Frame;

/**
 * Helper class to get the most recent versions of the smolFrame Javascript library.
 */
class SmolFrame
{

    public static function scriptFile(): string
    {
        return __DIR__ . '/smolFrame.js';
    }

    public static function scriptContent(): string
    {
        return file_get_contents(static::scriptFile());
    }

    public static function cssFile(): string
    {
        return __DIR__ . '/smolFrame.css';
    }

    public static function cssContent(): string
    {
        return file_get_contents(static::cssFile());
    }

}
