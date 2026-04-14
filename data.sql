USE detective_game;

-- ===============================
-- INSERT SUSPECTS
-- ===============================
INSERT INTO suspects VALUES
(1, 'Raj', 45, 'Security Guard', 'Was at entrance', 'Mall Entrance', 'Formal Suit', FALSE, 30),
(2, 'Priya', 32, 'Shop Owner', 'Closing shop', 'Jewelry Shop', 'Blue Dress', FALSE, 50),
(3, 'Aman', 28, 'Customer', 'Browsing items', 'Jewelry Shop', 'Red Jacket', TRUE, 95),
(4, 'Neha', 26, 'Cleaner', 'Cleaning after hours', 'Mall Hallway', 'Dark Uniform', TRUE, 60),
(5, 'Vikram', 35, 'Delivery Boy', 'Delivered package at 7:45 PM', 'Back Gate', 'Purple Jacket', FALSE, 55),
(6, 'Mehra', 52, 'Victim', 'Was reviewing stock records', 'Jewelry Shop', 'Red Jacket', TRUE, 45);

-- ===============================
-- INSERT LOCATIONS
-- ===============================
INSERT INTO locations VALUES
(1, 'Mall Entrance', 'Main entry point'),
(2, 'Jewelry Shop', 'Crime scene'),
(3, 'Mall Hallway', 'Common walking area'),
(4, 'Back Gate', 'Delivery entry');

-- ===============================
-- INSERT EVIDENCE
-- ===============================
INSERT INTO evidence VALUES
(1, 'Fingerprint', 'Jewelry Shop', 'Fingerprint found on glass display', 3),
(2, 'Footprint', 'Back Gate', 'Delivery footprints found near back gate', 5),
(3, 'Glove', 'Mall Hallway', 'Cleaning gloves found in hallway', 4),
(4, 'CCTV', 'Mall Entrance', 'Person in red jacket entered after closing', 3),
(5, 'CCTV', 'Mall Entrance', 'Raj was seen entering after closing hours', 1),
(6, 'CCTV', 'Back Gate', 'Vikram entered after closing for a second delivery check', 5);

-- ===============================
-- INSERT WITNESSES
-- ===============================
INSERT INTO witnesses VALUES
(1, 'Saw a person wearing a red jacket near the jewelry shop', 'Jewelry Shop', '8 PM'),
(2, 'Heard argument between a customer and shop owner', 'Jewelry Shop', '7:50 PM'),
(3, 'Someone entered after closing hours', 'Mall Entrance', '8:10 PM');