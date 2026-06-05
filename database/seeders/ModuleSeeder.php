<?php

namespace Database\Seeders;

use App\Models\Challenge;
use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->data() as $i => $mod) {
            $module = Module::create([
                'sequence' => $i + 1,
                'title' => $mod['title'],
                'type' => $mod['type'],
                'icon' => $mod['icon'],
                'blurb' => $mod['blurb'],
            ]);

            foreach ($mod['challenges'] as $order => $c) {
                Challenge::create(array_merge([
                    'module_id' => $module->id,
                    'order' => $order,
                    'material' => '',
                    'language' => 'text',
                    'image' => null,
                    'options' => null,
                    'correct' => null,
                    'answer' => null,
                    'answer_pattern' => null,
                    'answer_display' => null,
                ], $c));
            }
        }
    }

    /** MCQ helper. $correct = array of zero-based correct indices (single for mcq). */
    private function mcq(string $prompt, string $material, array $opts, array $correct, string $hint, int $points, int $tl, string $type = 'mcq'): array
    {
        $options = [];
        foreach ($opts as $idx => $text) {
            $options[] = ['id' => 'o'.$idx, 'text' => $text, 'image' => null];
        }

        return [
            'type' => $type,
            'prompt' => $prompt,
            'material' => $material,
            'language' => 'text',
            'options' => $options,
            'correct' => array_map(fn ($i) => 'o'.$i, $correct),
            'hint' => $hint,
            'points' => $points,
            'time_limit' => $tl,
        ];
    }

    private function txt(string $prompt, string $material, string $answer, string $hint, int $points, int $tl, string $lang = 'text'): array
    {
        return [
            'type' => 'text',
            'prompt' => $prompt,
            'material' => $material,
            'language' => $lang,
            'answer' => $answer,
            'hint' => $hint,
            'points' => $points,
            'time_limit' => $tl,
        ];
    }

    private function rgx(string $prompt, string $material, string $pattern, string $display, string $hint, int $points, int $tl): array
    {
        return [
            'type' => 'regex',
            'prompt' => $prompt,
            'material' => $material,
            'language' => 'bash',
            'answer_pattern' => $pattern,
            'answer_display' => $display,
            'hint' => $hint,
            'points' => $points,
            'time_limit' => $tl,
        ];
    }

    private function lang(array $c, string $lang): array
    {
        $c['language'] = $lang;

        return $c;
    }

    private function data(): array
    {
        return [
            [
                'title' => 'HTML Foundations', 'type' => 'choice', 'icon' => 'html',
                'blurb' => 'Markup, semantics & document structure.',
                'challenges' => [
                    $this->lang($this->mcq(
                        'Which element correctly marks up the MAIN navigation of a page?',
                        "<___>\n  <a href=\"/\">Home</a>\n  <a href=\"/docs\">Docs</a>\n</___>",
                        ['<navigation>', '<nav>', '<menu>', '<div class="nav">'], [1],
                        "It's a dedicated semantic element introduced in HTML5 for navigation blocks.", 100, 30
                    ), 'html'),
                    $this->lang($this->mcq(
                        'What does this attribute do for accessibility?',
                        '<img src="chart.png" alt="Q3 revenue up 14%">',
                        ['Sets the image title shown on hover', 'Provides text read by screen readers / shown if the image fails', 'Defines the image caption below it', "Improves the image's load priority"], [1],
                        'Think about users who cannot see the image at all.', 120, 30
                    ), 'html'),
                    $this->lang($this->txt(
                        'Type the single HTML tag (with angle brackets) used to embed an external stylesheet in <head>.',
                        "<head>\n  ____ rel=\"stylesheet\" href=\"app.css\">\n</head>",
                        '<link', "It's a void element — no closing tag — and shares its name with hyperlinks conceptually.", 140, 40
                    ), 'html'),
                ],
            ],
            [
                'title' => 'CSS Layout & Flexbox', 'type' => 'text', 'icon' => 'css',
                'blurb' => 'Box model, flexbox & responsive layout.',
                'challenges' => [
                    $this->txt('Complete the property that turns a container into a flex layout.',
                        ".row {\n  display: ______;\n  gap: 16px;\n}", 'flex',
                        "One word. It's the value, not the property name.", 120, 35, 'css'),
                    $this->lang($this->mcq('Which pair centers a single child both horizontally and vertically in a flex container?',
                        ".box {\n  display: flex;\n  /* ??? */\n}",
                        ['align-content: center; text-align: center;', 'justify-content: center; align-items: center;', 'place-content: stretch; vertical-align: middle;', 'margin: auto auto; float: center;'], [1],
                        'One controls the main axis, the other the cross axis.', 130, 30), 'css'),
                    $this->txt("Type the CSS unit (just the unit) equal to 1% of the viewport's height.",
                        '.hero { min-height: 100____; }', 'vh', 'Viewport height. Two letters.', 150, 40, 'css'),
                ],
            ],
            [
                'title' => 'JavaScript Fundamentals', 'type' => 'text', 'icon' => 'js',
                'blurb' => 'Variables, types, functions & control flow.',
                'challenges' => [
                    $this->txt('What does this log to the console?',
                        "const x = '5';\nconst y = 3;\nconsole.log(x + y);", '53',
                        "The string '5' coerces y into a string and they concatenate.", 140, 35, 'javascript'),
                    $this->lang($this->mcq('Which keyword declares a block-scoped variable that CANNOT be reassigned?',
                        "____ MAX = 100;\nMAX = 200; // TypeError",
                        ['var', 'let', 'const', 'static'], [2],
                        "It's constant — reassignment throws.", 150, 30), 'javascript'),
                    $this->txt('What is the result of this expression? Type the exact output.',
                        'console.log(typeof null);', 'object',
                        "A famous historical bug in JavaScript's type system.", 160, 40, 'javascript'),
                ],
            ],
            [
                'title' => 'DOM & Events', 'type' => 'choice', 'icon' => 'dom',
                'blurb' => 'Selecting, mutating & listening to the DOM.',
                'challenges' => [
                    $this->lang($this->mcq('Which method returns the FIRST element matching a CSS selector?',
                        "const el = document.__________('.card');",
                        ['getElementById', 'querySelector', 'querySelectorAll', 'getElementsByClassName'], [1],
                        'It takes a CSS selector and returns one element (or null).', 150, 30), 'javascript'),
                    $this->txt('Type the method name used to attach an event handler to an element.',
                        "btn.________________('click', handleClick);", 'addEventListener',
                        'One camelCase word: add + Event + Listener.', 160, 35, 'javascript'),
                    $this->lang($this->mcq('What does event.preventDefault() do inside a form submit handler?',
                        "form.addEventListener('submit', (e) => {\n  e.preventDefault();\n});",
                        ['Stops the event bubbling to parent elements', "Cancels the browser's default action (the page reload/navigation)", 'Removes the event listener after one call', 'Prevents other handlers on the same element from running'], [1],
                        'Bubbling is stopPropagation. This one cancels the default behavior.', 170, 30), 'javascript'),
                ],
            ],
            [
                'title' => 'Python Basics', 'type' => 'text', 'icon' => 'py',
                'blurb' => 'Syntax, data structures & comprehensions.',
                'challenges' => [
                    $this->txt('What does this print?',
                        "nums = [1, 2, 3, 4]\nprint([n*n for n in nums if n % 2 == 0])", '[4, 16]',
                        'Squares of the even numbers only: 2→4, 4→16.', 150, 35, 'python'),
                    $this->lang($this->mcq('Which data structure is created here?',
                        "data = {'a', 'b', 'c'}",
                        ['A dictionary', 'A set', 'A tuple', 'A frozenset'], [1],
                        'Curly braces with values but no key:value pairs.', 160, 30), 'python'),
                    $this->txt('Type the exact output.', "print('ab' * 3)", 'ababab',
                        'Multiplying a string repeats it.', 170, 40, 'python'),
                ],
            ],
            [
                'title' => 'Data Structures & Algorithms', 'type' => 'text', 'icon' => 'dsa',
                'blurb' => 'Complexity, sorting & core structures.',
                'challenges' => [
                    $this->mcq('What is the average time complexity of a lookup in a hash map?',
                        'value = map.get(key)  // average case?',
                        ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], [0],
                        "Constant time on average — that's the whole point of hashing.", 170, 35),
                    $this->txt('A stack follows which ordering principle? Type the 4-letter acronym.',
                        "push(1); push(2); push(3);\npop();  // returns ?", 'LIFO',
                        'Last In, First Out — pop() returns 3.', 180, 40),
                    $this->mcq('Which search requires the input array to be SORTED?',
                        '// find target in array',
                        ['Linear search', 'Binary search', 'Depth-first search', 'Hash lookup'], [1],
                        'It halves the search space each step — only works if order is known.', 190, 35),
                ],
            ],
            [
                'title' => 'SQL & Databases', 'type' => 'text', 'icon' => 'sql',
                'blurb' => 'Queries, joins & relational design.',
                'challenges' => [
                    $this->txt('Complete the keyword that filters rows BEFORE grouping.',
                        "SELECT name FROM users\n_____ age >= 18;", 'WHERE',
                        'The standard row filter clause.', 170, 35, 'sql'),
                    $this->lang($this->mcq('Which JOIN keeps ALL rows from the left table, even with no match on the right?',
                        'SELECT * FROM a ____ JOIN b ON a.id = b.a_id;',
                        ['INNER', 'LEFT', 'RIGHT', 'CROSS'], [1],
                        'It preserves everything on the left side.', 180, 30), 'sql'),
                    $this->txt('Type the aggregate function that counts rows.',
                        'SELECT _____(*) FROM orders;', 'COUNT',
                        'It literally counts. Five letters.', 190, 40, 'sql'),
                ],
            ],
            [
                'title' => 'Git & Version Control', 'type' => 'regex', 'icon' => 'git',
                'blurb' => 'Commits, branches & collaboration.',
                'challenges' => [
                    $this->rgx('Type the command that stages ALL changes (the whole working tree).',
                        '$ git ___ .', '^git\\s+add\\s+\\.$', 'git add .',
                        "The 'add' command with a dot for the current directory.", 180, 35),
                    $this->rgx('Type a command that creates AND switches to a new branch called feature.',
                        "$ git ________ -b feature\n# (or the newer 'switch' form)",
                        '^git\\s+(checkout\\s+-b|switch\\s+-c)\\s+feature$', 'git checkout -b feature  (or: git switch -c feature)',
                        'Classic: checkout -b <name>. Newer: switch -c <name>.', 190, 40),
                    $this->rgx('Type the command to commit staged changes with the message "init".',
                        '$ git commit ____ "init"', '^git\\s+commit\\s+-m\\s+["\']?init["\']?$', 'git commit -m "init"',
                        'Use the -m flag followed by the message.', 200, 35),
                ],
            ],
            [
                'title' => 'Networking & HTTP', 'type' => 'choice', 'icon' => 'net',
                'blurb' => 'Protocols, status codes & the request cycle.',
                'challenges' => [
                    $this->lang($this->mcq("Which HTTP status code means 'Not Found'?",
                        'HTTP/1.1 ___ Not Found', ['200', '301', '404', '500'], [2],
                        'The most famous error code on the web.', 190, 30), 'http'),
                    $this->txt('Type the HTTP method (uppercase) used to RETRIEVE a resource without side effects.',
                        '____ /api/users HTTP/1.1', 'GET',
                        "It's safe and idempotent — three letters.", 200, 35, 'http'),
                    $this->lang($this->mcq("What does the 'S' in HTTPS provide?",
                        'https://codeverse.dev',
                        ['Faster page speed', 'Encrypted transport via TLS', 'Server-side rendering', 'Static caching'], [1],
                        'Secure = the connection is encrypted.', 210, 30), 'http'),
                ],
            ],
            [
                'title' => 'Security & Cryptography', 'type' => 'text', 'icon' => 'sec',
                'blurb' => 'Hashing, auth & the final boss.',
                'challenges' => [
                    $this->mcq('Which is the correct way to store user passwords?',
                        '// pick one',
                        ['Plain text in the database', 'Reversible AES encryption', 'A salted one-way hash (e.g. bcrypt/argon2)', 'Base64 encoding'], [2],
                        'You should never be able to reverse a stored password.', 220, 35),
                    $this->txt("Type the 3-letter acronym for the token format: 'header.payload.signature'.",
                        'eyJhbGciOi...  .  eyJzdWIiOi...  .  SflKxwRJ...', 'JWT', 'JSON Web Token.', 230, 40),
                    $this->mcq('FINAL BOSS — Which attack injects malicious SQL through unsanitized input?',
                        "SELECT * FROM users WHERE name = '\" + input + \"';",
                        ['XSS', 'CSRF', 'SQL Injection', 'DDoS'], [2],
                        'The name says it: injecting SQL.', 250, 35),
                ],
            ],
        ];
    }
}
