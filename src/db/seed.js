'use strict';

// Demo catalogue. In production this is course data your instructors author;
// it lives here so the app runs with zero external dependencies.

const courses = [
  {
    id: 1,
    slug: 'foundations-of-sql',
    title: 'Foundations of SQL',
    subtitle: 'Read any database with confidence',
    description:
      'Start from a single SELECT and finish able to answer real questions from a relational database: filtering, joining across tables, grouping, and knowing when a query is slow because of you or because of the data.',
    level: 'Beginner',
    instructor: 'Ana Ruiz',
    minutes: 190
  },
  {
    id: 2,
    slug: 'ship-a-node-api',
    title: 'Ship a Node.js API',
    subtitle: 'From an empty folder to a running service',
    description:
      'Build a small HTTP API in Express, add authentication, write the tests that catch real regressions, and put it on a host where other people can use it. Every lesson ends with working code.',
    level: 'Intermediate',
    instructor: 'Dev Patel',
    minutes: 240
  },
  {
    id: 3,
    slug: 'design-systems-small-teams',
    title: 'Design systems for small teams',
    subtitle: 'Consistency without a full-time design team',
    description:
      'Most design systems die of ambition. This course covers the smallest useful version: a type scale, a colour set, six components, and the review habits that keep them from drifting apart.',
    level: 'Intermediate',
    instructor: 'Marta Lindqvist',
    minutes: 165
  }
];

const lessons = [
  // Foundations of SQL
  { id: 101, course_id: 1, slug: 'what-a-table-is', position: 1, minutes: 12,
    title: 'What a table actually is',
    summary: 'Rows, columns, types, and why nulls cause so much trouble later.',
    body: [
      'A table is a set of rows that all share the same shape. That shape is the column list: a name and a type for each field. The type is a promise the database keeps for you, so a column declared as an integer will never quietly contain the word "unknown".',
      'The exception to that promise is NULL. NULL is not zero and not an empty string; it means the value is absent. Comparisons against it return neither true nor false, which is why a filter like price != 100 silently drops rows where price is NULL.',
      'Before writing any query, look at the table definition and ask two questions: which column identifies a row uniquely, and which columns are allowed to be NULL. Those two answers explain most surprising results.'
    ].join('\n\n') },
  { id: 102, course_id: 1, slug: 'select-and-where', position: 2, minutes: 18,
    title: 'SELECT and WHERE',
    summary: 'Pulling out the rows you want and nothing else.',
    body: [
      'Every query answers a question about a subset of rows. SELECT names the columns you want back; WHERE decides which rows qualify. Reading a query in that order, rows first then columns, matches how the database executes it.',
      'Combine conditions with AND and OR, and use parentheses whenever you mix them. Without parentheses, AND binds tighter than OR, and a filter that looks like it excludes cancelled orders can quietly include all of them.',
      'Prefer IN over a chain of ORs, and use BETWEEN only for inclusive ranges. For dates, always compare against a half-open range instead of BETWEEN, because BETWEEN on a timestamp column excludes everything after midnight on the final day.'
    ].join('\n\n') },
  { id: 103, course_id: 1, slug: 'joins-without-fear', position: 3, minutes: 22,
    title: 'Joins without fear',
    summary: 'Inner, left, and the row-count trap nobody warns you about.',
    body: [
      'A join matches rows in one table against rows in another using a condition. An inner join keeps only pairs that matched. A left join keeps every row from the left table and fills the right side with NULLs when nothing matched.',
      'The trap is row multiplication. If one customer has three orders, joining customers to orders gives you three rows for that customer, and any SUM over a customer column will now triple-count. Check the row count before and after every join.',
      'When a left join is followed by a WHERE clause on the right-hand table, you have written an inner join by accident. Move that condition into the ON clause instead.'
    ].join('\n\n') },
  { id: 104, course_id: 1, slug: 'grouping-and-aggregates', position: 4, minutes: 20,
    title: 'Grouping and aggregates',
    summary: 'COUNT, SUM, and the difference between WHERE and HAVING.',
    body: [
      'GROUP BY collapses many rows into one row per distinct value. Every column in the SELECT list must either appear in the GROUP BY or be wrapped in an aggregate, because otherwise the database has no way to choose which of the collapsed values to show.',
      'WHERE filters rows before grouping. HAVING filters groups after. Putting a condition in the wrong one changes the answer: filtering out small orders before grouping changes each customer total, while filtering after grouping only removes whole customers.',
      'COUNT(*) counts rows. COUNT(column) counts non-null values in that column. The gap between the two numbers is a quick way to measure missing data.'
    ].join('\n\n') },

  // Ship a Node.js API
  { id: 201, course_id: 2, slug: 'routing-and-handlers', position: 1, minutes: 16,
    title: 'Routing and handlers',
    summary: 'How a request finds the function that answers it.',
    body: [
      'An Express app is an ordered list of middleware and routes. A request walks that list from the top until something sends a response. Order is the whole mental model: a route registered after a catch-all will never run.',
      'Keep handlers thin. A handler should read the request, call one function that does the real work, and turn the result into a status code and a body. Business logic that lives inside a handler cannot be tested without starting a server.',
      'Give every route an explicit status code. Returning 200 for a failed operation is the single most common cause of a client that retries forever.'
    ].join('\n\n') },
  { id: 202, course_id: 2, slug: 'validating-input', position: 2, minutes: 18,
    title: 'Validating input',
    summary: 'Reject bad requests at the edge, before they reach your data.',
    body: [
      'Treat every field of an incoming request as hostile until checked: type, length, range, and allowed values. Validation at the edge means the rest of your code can assume its inputs are sane, which removes defensive checks from every layer below.',
      'Return 400 with a body that names the offending field. "Invalid request" costs the caller an hour; "email must contain @" costs them ten seconds.',
      'Never build SQL by concatenating user input. Parameterised queries are not a performance detail, they are the boundary that stops a search box from dropping your tables.'
    ].join('\n\n') },
  { id: 203, course_id: 2, slug: 'sessions-and-tokens', position: 3, minutes: 24,
    title: 'Sessions and tokens',
    summary: 'Why a stateless token survives a restart and a server session does not.',
    body: [
      'A server-side session stores state in the process that issued it. That works until you run a second instance, at which point half the requests land on a machine that has never heard of the user and log them out.',
      'A signed token moves that state into the cookie itself. Any instance can verify it with the shared secret, so scaling out and restarting both become non-events. The cost is revocation: a token stays valid until it expires.',
      'Set the cookie httpOnly so scripts cannot read it, secure so it only travels over TLS, and sameSite=lax so it is not sent on cross-site form posts. Keep lifetimes short enough that a stolen token expires before it is useful.'
    ].join('\n\n') },
  { id: 204, course_id: 2, slug: 'ready-for-a-host', position: 4, minutes: 20,
    title: 'Getting ready for a host',
    summary: 'Ports, config, logs, and shutting down cleanly.',
    body: [
      'A hosted app does not choose its own port. Read it from the environment and bind to every interface, because the platform routes traffic to your container from outside it.',
      'Configuration belongs in environment variables, never in a file you deploy. The same build artefact should run in staging and production with nothing changed but its settings.',
      'Write logs to standard output as one JSON object per line, and handle SIGTERM by closing the server before exiting. Those two habits are the difference between a deploy nobody notices and a deploy that drops requests.'
    ].join('\n\n') },

  // Design systems
  { id: 301, course_id: 3, slug: 'a-type-scale', position: 1, minutes: 14,
    title: 'A type scale you will actually use',
    summary: 'Six sizes, two weights, and the discipline to stop there.',
    body: [
      'Pick a base size for body text, then generate a handful of steps above and below it with a consistent ratio. Six sizes cover almost every interface; a seventh usually means a layout problem rather than a typography problem.',
      'Line height moves in the opposite direction to size. Small text needs more leading relative to its size, large display text needs less, often below 1.1 for headlines.',
      'Constrain measure before you adjust anything else. Body text past roughly 80 characters per line is harder to read no matter which typeface you chose.'
    ].join('\n\n') },
  { id: 302, course_id: 3, slug: 'colour-with-meaning', position: 2, minutes: 16,
    title: 'Colour that carries meaning',
    summary: 'Assign roles to colours so nobody has to guess.',
    body: [
      'Name colours by role, not by hue. A token called "danger" survives a rebrand; a token called "red" becomes a lie the moment the brand changes.',
      'Every foreground and background pair needs a contrast ratio you have actually measured. Aim for at least 4.5:1 for body text and 3:1 for large text and interface borders.',
      'Never use colour as the only signal. Pair it with an icon, a label, or a shape, so the meaning survives both colour blindness and a monochrome printout.'
    ].join('\n\n') },
  { id: 303, course_id: 3, slug: 'six-components', position: 3, minutes: 18,
    title: 'The six components to build first',
    summary: 'Button, field, select, dialog, table, and empty state.',
    body: [
      'Most products can be assembled from a small set of primitives. Build the button, text field, select, dialog, data table, and empty state properly, and the rest of the interface becomes composition rather than invention.',
      'Each component needs its states defined up front: default, hover, focus, active, disabled, loading, and error. A component without a defined focus state is a component that fails keyboard users.',
      'The empty state is the one people skip and the one users see first. Say what would appear here and give them the action that puts something in it.'
    ].join('\n\n') },
  { id: 304, course_id: 3, slug: 'keeping-it-alive', position: 4, minutes: 15,
    title: 'Keeping the system alive',
    summary: 'Review habits that stop drift without slowing anyone down.',
    body: [
      'A design system decays through small exceptions. One custom shade, one off-scale margin, and within a quarter the tokens describe a product that no longer exists.',
      'Make the system the path of least resistance. If using the shared button is slower than writing a new one, people will write a new one, and no amount of documentation will change that.',
      'Review changes to the system separately from feature work, with one owner who can say no. Shared ownership of a design system means nobody owns it.'
    ].join('\n\n') }
];

const questions = [
  { id: 1, lesson_id: 101, prompt: 'A price column contains NULL for some rows. Which rows does WHERE price != 100 return?',
    options: ['All rows except those priced 100, including the NULLs', 'Only rows with a price that is not 100, excluding NULLs', 'All rows in the table', 'It raises an error'],
    answer_index: 1,
    explanation: 'Comparisons with NULL are unknown rather than true, so those rows fail the filter and drop out silently.' },
  { id: 2, lesson_id: 103, prompt: 'You LEFT JOIN orders onto customers, then add WHERE orders.status = \'paid\'. What have you built?',
    options: ['A left join that keeps customers with no orders', 'An inner join', 'A cross join', 'A query that returns no rows'],
    answer_index: 1,
    explanation: 'The WHERE clause discards the NULL-filled rows the left join added, so only matching pairs survive.' },
  { id: 3, lesson_id: 203, prompt: 'Why does a server-side session break when the app scales to two instances?',
    options: ['Cookies cannot be shared between instances', 'The session lives in one process, so the other instance does not recognise it', 'Tokens expire faster under load', 'TLS is terminated twice'],
    answer_index: 1,
    explanation: 'In-process session state is invisible to the second instance, which is why it logs the user out on roughly half of requests.' },
  { id: 4, lesson_id: 204, prompt: 'Why should a hosted app read its port from the environment?',
    options: ['It is faster than a fixed port', 'The platform assigns the port and routes traffic to it', 'It avoids firewall rules', 'Node cannot bind a fixed port'],
    answer_index: 1,
    explanation: 'The host decides which port your container listens on and forwards requests there; a hardcoded port simply never receives traffic.' },
  { id: 5, lesson_id: 302, prompt: 'What is the problem with naming a token "red" instead of "danger"?',
    options: ['It is harder to remember', 'The name stops being true when the colour changes', 'It fails contrast checks', 'Designers prefer hex values'],
    answer_index: 1,
    explanation: 'Role-based names survive a palette change; hue-based names have to be renamed everywhere or become misleading.' }
];

module.exports = { courses, lessons, questions };
