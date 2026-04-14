USE detective_game;

-- name: game_suspects
SELECT
    s.suspect_id AS id,
    CONCAT('Suspect ', CAST(ROW_NUMBER() OVER (ORDER BY s.suspect_id) AS CHAR)) AS alias_name,
    s.name AS db_name,
    s.age AS age,
    s.occupation AS role,
    s.alibi AS alibi,
    s.location AS location,
    s.clothing AS jacket,
    CASE WHEN s.fingerprint_match = TRUE THEN 'Yes' ELSE 'No' END AS fingerprint,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM evidence e
            WHERE e.related_suspect_id = s.suspect_id
                AND (LOWER(e.type) = 'cctv' OR LOWER(e.description) LIKE '%after closing%')
        ) THEN 'Yes'
        ELSE 'No'
    END AS entered_late,
    CASE LOWER(s.name)
        WHEN 'raj' THEN 'Assets/raj.png'
        WHEN 'priya' THEN 'Assets/priya.png'
        WHEN 'aman' THEN 'Assets/aman.png'
        WHEN 'neha' THEN 'Assets/neha.png'
        WHEN 'vikram' THEN 'Assets/vikram.png'
        WHEN 'mehra' THEN 'Assets/mehra.png'
        ELSE 'Assets/FirstPage.jpg'
    END AS image
FROM suspects s
ORDER BY s.suspect_id;

-- name: game_clues
SELECT
    'jacket' AS id,
    'checkroom' AS icon,
    'Witness Report' AS title,
    COALESCE(
        (
            SELECT statement
            FROM witnesses
            WHERE LOWER(statement) LIKE '%red jacket%'
            LIMIT 1
        ),
        'A witness mentioned a red jacket near the crime scene.'
    ) AS text
UNION ALL
SELECT
    'fingerprint' AS id,
    'fingerprint' AS icon,
    'Forensic Match' AS title,
    COALESCE(
        (
            SELECT description
            FROM evidence
            WHERE LOWER(type) = 'fingerprint'
            LIMIT 1
        ),
        'Fingerprint evidence was found at the jewelry shop.'
    ) AS text
UNION ALL
SELECT
    'time' AS id,
    'schedule' AS icon,
    'Entry Log' AS title,
    COALESCE(
        (
            SELECT statement
            FROM witnesses
            WHERE LOWER(statement) LIKE '%after closing%'
            LIMIT 1
        ),
        (
            SELECT description
            FROM evidence
            WHERE LOWER(type) = 'cctv'
            ORDER BY evidence_id DESC
            LIMIT 1
        ),
        'Entry happened after closing time according to records.'
    ) AS text
UNION ALL
SELECT
    'scene' AS id,
    'location_on' AS icon,
    'Crime Scene Context' AS title,
    CONCAT(
        'Primary scene: ',
        COALESCE((SELECT name FROM locations WHERE name = 'Jewelry Shop' LIMIT 1), 'Jewelry Shop'),
        '. ',
        COALESCE((SELECT description FROM locations WHERE name = 'Jewelry Shop' LIMIT 1), 'Main crime location.'),
        ' Suspects seen there: ',
        COALESCE((SELECT COUNT(*) FROM suspects WHERE location = 'Jewelry Shop'), 0)
    ) AS text;

-- name: game_culprit
SELECT name
FROM (
        SELECT
                s.name,
                1 AS priority,
                s.suspicion_score
        FROM suspects s
        WHERE LOWER(s.clothing) LIKE '%red%'
            AND s.fingerprint_match = TRUE
            AND EXISTS (
                    SELECT 1
                    FROM evidence e
                    WHERE e.related_suspect_id = s.suspect_id
                        AND (LOWER(e.type) = 'cctv' OR LOWER(e.description) LIKE '%after closing%')
            )

        UNION ALL

        SELECT
                s.name,
                2 AS priority,
                s.suspicion_score
        FROM suspects s
        WHERE NOT EXISTS (
                SELECT 1
                FROM suspects s2
                WHERE LOWER(s2.clothing) LIKE '%red%'
                    AND s2.fingerprint_match = TRUE
                    AND EXISTS (
                            SELECT 1
                            FROM evidence e2
                            WHERE e2.related_suspect_id = s2.suspect_id
                                AND (LOWER(e2.type) = 'cctv' OR LOWER(e2.description) LIKE '%after closing%')
                    )
        )
) ranked
ORDER BY priority, suspicion_score DESC
LIMIT 1;

-- name: game_investigation_scene_suspects
SELECT name, location
FROM suspects
WHERE location = 'Jewelry Shop'
ORDER BY suspect_id;

-- name: game_investigation_red_clothing
SELECT name, clothing
FROM suspects
WHERE clothing LIKE '%Red%'
ORDER BY suspect_id;

-- name: game_investigation_fingerprint
SELECT name
FROM suspects
WHERE fingerprint_match = TRUE
ORDER BY suspect_id;

-- name: game_investigation_witness_scene
SELECT statement, location, time
FROM witnesses
WHERE location = 'Jewelry Shop'
ORDER BY witness_id;

-- name: game_investigation_evidence_match
SELECT s.name, e.type, e.description
FROM suspects s
JOIN evidence e ON s.suspect_id = e.related_suspect_id
ORDER BY e.evidence_id;


-- ===============================
-- INVESTIGATION QUERIES (MANUAL)
-- ===============================

-- View all suspects
SELECT * FROM suspects;

-- View all evidence
SELECT * FROM evidence;

-- View all witnesses
SELECT * FROM witnesses;

-- View all locations
SELECT * FROM locations;

-- 1. Suspects at crime scene
SELECT name, location
FROM suspects
WHERE location = 'Jewelry Shop';

-- 2. Suspects wearing red (clue)
SELECT name, clothing
FROM suspects
WHERE clothing LIKE '%Red%';

-- 3. Suspects with fingerprint match
SELECT name
FROM suspects
WHERE fingerprint_match = TRUE;

-- 4. Witness statements near crime scene
SELECT *
FROM witnesses
WHERE location = 'Jewelry Shop';

-- 5. Match suspects with evidence
SELECT s.name, e.type, e.description
FROM suspects s
JOIN evidence e ON s.suspect_id = e.related_suspect_id;

-- 6. Most suspicious suspect
SELECT name, suspicion_score
FROM suspects
ORDER BY suspicion_score DESC
LIMIT 1;