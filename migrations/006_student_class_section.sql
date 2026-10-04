-- Normalize only values that map unambiguously to the configured lists.
UPDATE students SET class = 'KG' || substr(replace(lower(trim(class)), ' ', ''), 3)
WHERE replace(lower(trim(class)), ' ', '') IN ('kg1', 'kg2');
WITH grades AS (SELECT 1 AS n UNION ALL SELECT n+1 FROM grades WHERE n < 12)
UPDATE students SET class = (
  SELECT 'Grade ' || n FROM grades WHERE lower(trim(students.class)) IN (CAST(n AS TEXT), 'grade ' || n, 'year ' || n)
) WHERE EXISTS (SELECT 1 FROM grades WHERE lower(trim(students.class)) IN (CAST(n AS TEXT), 'grade ' || n, 'year ' || n));
UPDATE students SET section = upper(trim(section)) WHERE upper(trim(section)) IN ('A','B','C','D','E','F');
