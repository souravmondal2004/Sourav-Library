-- Initial seed data for Oracle Database

-- Categories
INSERT INTO CATEGORIES (NAME, SLUG, DESCRIPTION, ICON) VALUES ('Technology & Coding', 'technology-coding', 'Software engineering, architecture, AI, cloud computing, and cybersecurity.', 'laptop');
INSERT INTO CATEGORIES (NAME, SLUG, DESCRIPTION, ICON) VALUES ('Business & Leadership', 'business-leadership', 'Entrepreneurship, startups, management, leadership strategies, and case studies.', 'briefcase');
INSERT INTO CATEGORIES (NAME, SLUG, DESCRIPTION, ICON) VALUES ('Science & Engineering', 'science-engineering', 'Physics, chemistry, data science, mechanics, and modern innovations.', 'atom');
INSERT INTO CATEGORIES (NAME, SLUG, DESCRIPTION, ICON) VALUES ('Literature & Fiction', 'literature-fiction', 'Classic novels, modern anthologies, short stories, and creative non-fiction.', 'book-open');
INSERT INTO CATEGORIES (NAME, SLUG, DESCRIPTION, ICON) VALUES ('Personal Growth & Psychology', 'personal-growth', 'Habits, mindfulness, decision making, mental models, and productivity.', 'compass');
INSERT INTO CATEGORIES (NAME, SLUG, DESCRIPTION, ICON) VALUES ('Academic & Research Papers', 'academic-research', 'Peer-reviewed articles, monographs, dissertations, and technical reports.', 'file-text');

COMMIT;
