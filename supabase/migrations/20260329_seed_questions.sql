-- Seed Categories and Questions for ighub Testing Platform
-- Version 2: Shuffled options, idempotent inserts, and content fixes.

-- 1. Insert Categories (if they don't exist)
INSERT INTO question_categories (name)
VALUES 
  ('AI'),
  ('Internet & Online Safety'),
  ('Google Workspace'),
  ('Digital Literacy'),
  ('Digital Marketing'),
  ('Cybersecurity'),
  ('Data Analytics'),
  ('Graphic Design'),
  ('Product Design'),
  ('Web Development (Backend)'),
  ('Web Development (Frontend)'),
  ('Soft Skills'),
  ('Job Readiness')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Questions
-- We use a DO block to handle variable assignment for category IDs
DO $$
DECLARE
  cat_ai UUID;
  cat_internet UUID;
  cat_workspace UUID;
  cat_lit UUID;
  cat_marketing UUID;
  cat_cyber UUID;
  cat_data UUID;
  cat_graphic UUID;
  cat_product UUID;
  cat_backend UUID;
  cat_frontend UUID;
  cat_soft UUID;
  cat_job UUID;
BEGIN
  -- Get IDs
  SELECT id INTO cat_ai FROM question_categories WHERE name = 'AI';
  SELECT id INTO cat_internet FROM question_categories WHERE name = 'Internet & Online Safety';
  SELECT id INTO cat_workspace FROM question_categories WHERE name = 'Google Workspace';
  SELECT id INTO cat_lit FROM question_categories WHERE name = 'Digital Literacy';
  SELECT id INTO cat_marketing FROM question_categories WHERE name = 'Digital Marketing';
  SELECT id INTO cat_cyber FROM question_categories WHERE name = 'Cybersecurity';
  SELECT id INTO cat_data FROM question_categories WHERE name = 'Data Analytics';
  SELECT id INTO cat_graphic FROM question_categories WHERE name = 'Graphic Design';
  SELECT id INTO cat_product FROM question_categories WHERE name = 'Product Design';
  SELECT id INTO cat_backend FROM question_categories WHERE name = 'Web Development (Backend)';
  SELECT id INTO cat_frontend FROM question_categories WHERE name = 'Web Development (Frontend)';
  SELECT id INTO cat_soft FROM question_categories WHERE name = 'Soft Skills';
  SELECT id INTO cat_job FROM question_categories WHERE name = 'Job Readiness';

  -- HELPER: Ideally we'd have a function, but for a seed we'll just use INSERT ... SELECT ... WHERE NOT EXISTS
  -- AI Questions
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'Which of the following is a primary component of Artificial Intelligence?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'AI Components', 'multiple_choice', 'Which of the following is a primary component of Artificial Intelligence?', '["Manual Data Entry", "Hardware Assembly", "Machine Learning", "Direct Human Control"]', 'Machine Learning');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'Generative AI is capable of creating new content such as text, images, and music.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'Generative AI', 'true_false', 'Generative AI is capable of creating new content such as text, images, and music.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'Which principle is central to responsible AI use?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'AI Ethics', 'multiple_choice', 'Which principle is central to responsible AI use?', '["Unrestricted data scraping", "Opacity in decision making", "Exclusivity", "Bias mitigation"]', 'Bias mitigation');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'Deep learning is a subset of which technology?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'Deep Learning', 'multiple_choice', 'Deep learning is a subset of which technology?', '["Mechanical Engineering", "Traditional Programming", "Machine Learning", "Cloud Storage"]', 'Machine Learning');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'Virtual assistants like Siri and Alexa do not use AI.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'AI in daily life', 'true_false', 'Virtual assistants like Siri and Alexa do not use AI.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'What does NLP stand for in the context of AI?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'NLP definition', 'multiple_choice', 'What does NLP stand for in the context of AI?', '["Neural Logic Programming", "Natural Language Processing", "Network Layer Protocol", "Node Loading Process"]', 'Natural Language Processing');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'Machine learning models primarily improve their performance through:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'Machine Learning Data', 'multiple_choice', 'Machine learning models primarily improve their performance through:', '["Increasing clock speed", "Manual code updates", "Exposure to data", "Deleting old files"]', 'Exposure to data');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'AI "hallucination" refers to when an AI generates confident but incorrect information.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'AI Hallucination', 'true_false', 'AI "hallucination" refers to when an AI generates confident but incorrect information.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'Current AI systems are generally considered:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'AI Limitations', 'multiple_choice', 'Current AI systems are generally considered:', '["Narrow AI", "General AI", "Super AI", "Sentient AI"]', 'Narrow AI');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_ai AND question_text = 'Application of AI that allows computers to interpret and understand visual information from the world:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_ai, 'Computer Vision', 'multiple_choice', 'Application of AI that allows computers to interpret and understand visual information from the world:', '["Audio Processing", "Data Mining", "Web Scraping", "Computer Vision"]', 'Computer Vision');
  END IF;

  -- Internet & Online Safety
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'Which of these is considered a strong password characteristic?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Strong Passwords', 'multiple_choice', 'Which of these is considered a strong password characteristic?', '["Using your birth date", "Minimum 12 characters with mix of types", "Using \"password123\"", "Short and easy to remember"]', 'Minimum 12 characters with mix of types');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'Phishing is a method where attackers pose as legitimate entities to steal sensitive information.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Phishing', 'true_false', 'Phishing is a method where attackers pose as legitimate entities to steal sensitive information.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'The "S" in HTTPS stands for:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'HTTPS', 'multiple_choice', 'The "S" in HTTPS stands for:', '["Standard", "Simple", "Secure", "System"]', 'Secure');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'Two-factor authentication (2FA) adds an extra layer of security beyond just a password.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Two-Factor Authentication', 'true_false', 'Two-factor authentication (2FA) adds an extra layer of security beyond just a password.', '["False", "True"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'When using public Wi-Fi, it is safest to:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Public Wi-Fi', 'multiple_choice', 'When using public Wi-Fi, it is safest to:', '["Login to bank accounts", "Share your screen", "Disable your firewall", "Use a VPN"]', 'Use a VPN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'Generic term for malicious software designed to disrupt, damage, or gain unauthorized access:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Malware', 'multiple_choice', 'Generic term for malicious software designed to disrupt, damage, or gain unauthorized access:', '["Spyware only", "Malware", "Hardware", "Firmware"]', 'Malware');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'Incognito/Private mode hides your activity from your Internet Service Provider (ISP).') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Browser Security', 'true_false', 'Incognito/Private mode hides your activity from your Internet Service Provider (ISP).', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'Your "digital footprint" consists of:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Digital Footprint', 'multiple_choice', 'Your "digital footprint" consists of:', '["Only your social media posts", "The size of your computer", "All traces of your online activity", "Your internet speed"]', 'All traces of your online activity');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'You should always read the Privacy Policy before sharing sensitive data with a website.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Data Privacy', 'true_false', 'You should always read the Privacy Policy before sharing sensitive data with a website.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_internet AND question_text = 'Manipulating people into giving up confidential information is called:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_internet, 'Social Engineering', 'multiple_choice', 'Manipulating people into giving up confidential information is called:', '["Social Engineering", "Network Sniffing", "Brute Force", "Spoofing"]', 'Social Engineering');
  END IF;

  -- Google Workspace
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'Google Docs allows multiple people to edit the same document simultaneously.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Cloud Collaboration', 'true_false', 'Google Docs allows multiple people to edit the same document simultaneously.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'In Google Sheets, all formulas must start with which symbol?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Formula start', 'multiple_choice', 'In Google Sheets, all formulas must start with which symbol?', '["@", "=", "#", "+"]', '=');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'To let someone view a file without editing it in Drive, you should set their permission to:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Google Drive Sharing', 'multiple_choice', 'To let someone view a file without editing it in Drive, you should set their permission to:', '["Editor", "Commenter", "Viewer", "Owner"]', 'Viewer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'Google Drive and Gmail share the same total storage quota.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Gmail Storage', 'true_false', 'Google Drive and Gmail share the same total storage quota.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'Which tool is used for creating presentations in Google Workspace?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Google Slides', 'multiple_choice', 'Which tool is used for creating presentations in Google Workspace?', '["Google Docs", "Google Sheets", "Google Slides", "Google Forms"]', 'Google Slides');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'The primary purpose of Google Forms is:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Google Forms', 'multiple_choice', 'The primary purpose of Google Forms is:', '["Budgeting", "Surveys and data collection", "Image editing", "Video conferencing"]', 'Surveys and data collection');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'Google Workspace apps automatically save changes as you work.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Auto-save', 'true_false', 'Google Workspace apps automatically save changes as you work.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'Which tool is primarily for video conferencing?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Google Meet', 'multiple_choice', 'Which tool is primarily for video conferencing?', '["Google Chat", "Google Meet", "Google Keep", "Google Tasks"]', 'Google Meet');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'Google Drive allows you to search for files by:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Drive Search', 'multiple_choice', 'Google Drive allows you to search for files by:', '["File type, owner, and keywords", "File size only", "Color of the icon", "Date created only"]', 'File type, owner, and keywords');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_workspace AND question_text = 'Gmail uses folders instead of labels to organize emails.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_workspace, 'Gmail Labels', 'true_false', 'Gmail uses folders instead of labels to organize emails.', '["False", "True"]', 'False');
  END IF;

  -- Digital Literacy
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'Digital literacy refers to the ability to:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'Digital Literacy definition', 'multiple_choice', 'Digital literacy refers to the ability to:', '["Repair computer hardware", "Memorize all keyboard shortcuts", "Find, evaluate, and communicate information via digital platforms", "Use only one type of software"]', 'Find, evaluate, and communicate information via digital platforms');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'Any information found on social media is considered a credible source for research.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'Credible Sources', 'true_false', 'Any information found on social media is considered a credible source for research.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'Storing and accessing data over the internet instead of a local hard drive is called:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'Cloud Computing', 'multiple_choice', 'Storing and accessing data over the internet instead of a local hard drive is called:', '["Local Backup", "Cloud Computing", "Physical Storage", "Network Routing"]', 'Cloud Computing');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'Which of the following is an Operating System?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'Operating Systems', 'multiple_choice', 'Which of the following is an Operating System?', '["Google Chrome", "Windows", "Microsoft Word", "Intel Core i7"]', 'Windows');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'Organizing files into folders makes it easier to retrieve information later.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'File Management', 'true_false', 'Organizing files into folders makes it easier to retrieve information later.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'Physical components of a computer are called:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'Hardware vs Software', 'multiple_choice', 'Physical components of a computer are called:', '["Software", "Hardware", "Firmware", "Malware"]', 'Hardware');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'What does URL stand for?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'URL meaning', 'multiple_choice', 'What does URL stand for?', '["Uniform Resource Locator", "Universal Radio Link", "Unified Register List", "User Response Level"]', 'Uniform Resource Locator');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'A search engine is the same thing as a web browser.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'Search Engines', 'true_false', 'A search engine is the same thing as a web browser.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'Practices and steps users take to maintain system health and improve online security:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'Cyber Hygiene', 'multiple_choice', 'Practices and steps users take to maintain system health and improve online security:', '["System Defragmentation", "Cyber Hygiene", "Data Mining", "Hardware Maintenance"]', 'Cyber Hygiene');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_lit AND question_text = 'Which of these is an input device?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_lit, 'Input Devices', 'multiple_choice', 'Which of these is an input device?', '["Monitor", "Keyboard", "Printer", "Speakers"]', 'Keyboard');
  END IF;

  -- Digital Marketing
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'What does SEO stand for?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'SEO meaning', 'multiple_choice', 'What does SEO stand for?', '["Social Engagement Office", "Simplified Export Options", "Search Engine Optimization", "Site Efficiency Overview"]', 'Search Engine Optimization');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'Content marketing focuses on creating and distributing valuable, relevant content to attract an audience.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'Content Marketing', 'true_false', 'Content marketing focuses on creating and distributing valuable, relevant content to attract an audience.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'Which represents a B2B focused social media platform?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'Social Media Channels', 'multiple_choice', 'Which represents a B2B focused social media platform?', '["TikTok", "Instagram", "LinkedIn", "Pinterest"]', 'LinkedIn');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'PPC stands for:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'PPC', 'multiple_choice', 'PPC stands for:', '["Price-Per-Customer", "Pay-Per-Click", "Post-Purchase-Cost", "Personal-Phone-Call"]', 'Pay-Per-Click');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'Spamming is an effective and ethical email marketing strategy.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'Email Marketing', 'true_false', 'Spamming is an effective and ethical email marketing strategy.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'CTR in digital marketing refers to:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'CTR', 'multiple_choice', 'CTR in digital marketing refers to:', '["Customer Total Revenue", "Click-Through Rate", "Content Timing Report", "Channel Target Range"]', 'Click-Through Rate');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'The specific group of people a marketing campaign aims to reach:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'Target Audience', 'multiple_choice', 'The specific group of people a marketing campaign aims to reach:', '["Random Sample", "General Public", "Target Audience", "Global Market"]', 'Target Audience');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'Digital marketing allows for precise measurement of campaign performance.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'Analytics', 'true_false', 'Digital marketing allows for precise measurement of campaign performance.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'Marketing involving endorsements from people with a dedicated social following:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'Influencer Marketing', 'multiple_choice', 'Marketing involving endorsements from people with a dedicated social following:', '["Influencer Marketing", "Affiliate Marketing", "Direct Mail", "Broadcast Marketing"]', 'Influencer Marketing');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_marketing AND question_text = 'When a user completes a desired action (e.g., making a purchase), it is called a:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_marketing, 'Conversion', 'multiple_choice', 'When a user completes a desired action (e.g., making a purchase), it is called a:', '["Impression", "Conversion", "Bounce", "Reach"]', 'Conversion');
  END IF;

  -- Cybersecurity
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'A system designed to prevent unauthorized access to or from a private network:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'Firewalls', 'multiple_choice', 'A system designed to prevent unauthorized access to or from a private network:', '["Router", "Switch", "Firewall", "Hub"]', 'Firewall');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'Encryption converts data into a code to prevent unauthorized access.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'Encryption', 'true_false', 'Encryption converts data into a code to prevent unauthorized access.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'Malware that threatens to publish or block access to data unless a ransom is paid:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'Ransomware', 'multiple_choice', 'Malware that threatens to publish or block access to data unless a ransom is paid:', '["Adware", "Ransomware", "Trojan", "Worm"]', 'Ransomware');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'What does VPN stand for?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'VPN', 'multiple_choice', 'What does VPN stand for?', '["Verified Public Node", "Visual Protocol Network", "Virtual Private Network", "Virtual Protected Navigation"]', 'Virtual Private Network');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'You should delay software updates as long as possible to avoid bugs.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'Updating Software', 'true_false', 'You should delay software updates as long as possible to avoid bugs.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'A security flaw unknown to the software vendor that is exploited by hackers:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'Zero-day vulnerability', 'multiple_choice', 'A security flaw unknown to the software vendor that is exploited by hackers:', '["Legacy bug", "Syntax error", "Zero-day vulnerability", "Logic bomb"]', 'Zero-day vulnerability');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'Security based on physical characteristics such as fingerprints or facial recognition:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'Biometrics', 'multiple_choice', 'Security based on physical characteristics such as fingerprints or facial recognition:', '["Cryptography", "Steganography", "Biometrics", "Tokenization"]', 'Biometrics');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'A DDoS attack aims to overwhelm a server with traffic from many sources.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'DDoS', 'true_false', 'A DDoS attack aims to overwhelm a server with traffic from many sources.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'The fraudulent acquisition and use of a person''s private identifying information:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'Identity Theft', 'multiple_choice', 'The fraudulent acquisition and use of a person''s private identifying information:', '["Phishing", "Identity Theft", "Spoofing", "Skimming"]', 'Identity Theft');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_cyber AND question_text = 'The principle of providing users with only the access necessary for their job:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_cyber, 'Least Privilege', 'multiple_choice', 'The principle of providing users with only the access necessary for their job:', '["Least Privilege", "Full Access", "Implicit Trust", "Segregation of Duties"]', 'Least Privilege');
  END IF;

  -- Data Analytics
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'Extremely large data sets that may be analyzed computationally to reveal patterns:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Big Data', 'multiple_choice', 'Extremely large data sets that may be analyzed computationally to reveal patterns:', '["Sparse Data", "Big Data", "Metadata", "Static Data"]', 'Big Data');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'Data visualization helps in communicating complex data insights using graphs and charts.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Data Visualization', 'true_false', 'Data visualization helps in communicating complex data insights using graphs and charts.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'Data that can be measured and expressed in numbers is:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Quantitative vs Qualitative', 'multiple_choice', 'Data that can be measured and expressed in numbers is:', '["Qualitative", "Quantitative", "Subjective", "Categorical"]', 'Quantitative');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'The standard language for managing data held in a relational database:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'SQL', 'multiple_choice', 'The standard language for managing data held in a relational database:', '["Python", "Java", "SQL", "C++"]', 'SQL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'Data cleaning is an optional step in the data analysis process.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Data Cleaning', 'true_false', 'Data cleaning is an optional step in the data analysis process.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'Using historical data to make predictions about future events:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Predictive Analytics', 'multiple_choice', 'Using historical data to make predictions about future events:', '["Descriptive Analytics", "Predictive Analytics", "Diagnostic Analytics", "Prescriptive Analytics"]', 'Predictive Analytics');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'The average value of a data set is also known as the:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Mean', 'multiple_choice', 'The average value of a data set is also known as the:', '["Mean", "Median", "Mode", "Range"]', 'Mean');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'Correlation always implies causation.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Correlation', 'true_false', 'Correlation always implies causation.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'A statistical method used to determine if there is enough evidence in a sample of data to infer that a certain condition is true for the entire population:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Hypothesis Testing', 'multiple_choice', 'A statistical method used to determine if there is enough evidence in a sample of data to infer that a certain condition is true for the entire population:', '["Data Mining", "Hypothesis Testing", "Regression Analysis", "Clustering"]', 'Hypothesis Testing');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_data AND question_text = 'In a relational database, data is organized into:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_data, 'Database Table', 'multiple_choice', 'In a relational database, data is organized into:', '["Tables", "Folders", "Lists", "Heaps"]', 'Tables');
  END IF;

  -- Graphic Design
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'The art and technique of arranging type to make written language legible, readable, and appealing:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'Typography', 'multiple_choice', 'The art and technique of arranging type to make written language legible, readable, and appealing:', '["Calligraphy", "Typography", "Iconography", "Photography"]', 'Typography');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'Complementary colors are located opposite each other on the color wheel.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'Color Theory', 'true_false', 'Complementary colors are located opposite each other on the color wheel.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'Images made of pixels that lose quality when scaled up:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'Raster images', 'multiple_choice', 'Images made of pixels that lose quality when scaled up:', '["Vector images", "SVG", "Raster images", "Geometric shapes"]', 'Raster images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'Vector images can be scaled indefinitely without losing quality.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'Vector images', 'true_false', 'Vector images can be scaled indefinitely without losing quality.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'The empty area around design elements is called:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'White Space', 'multiple_choice', 'The empty area around design elements is called:', '["White Space", "Dead Space", "Negative Margin", "Padding"]', 'White Space');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'Arranging elements to show their order of importance is:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'Hierarchy', 'multiple_choice', 'Arranging elements to show their order of importance is:', '["Visual Hierarchy", "Balance", "Proximity", "Alignment"]', 'Visual Hierarchy');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'The color model used primarily for print is:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'CMYK', 'multiple_choice', 'The color model used primarily for print is:', '["RGB", "HSL", "HEX", "CMYK"]', 'CMYK');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'High resolution (300 DPI) is typically required for professional printing.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'Resolution', 'true_false', 'High resolution (300 DPI) is typically required for professional printing.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'The visual identity of a company, including logo, colors, and fonts:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'Branding', 'multiple_choice', 'The visual identity of a company, including logo, colors, and fonts:', '["Marketing", "Branding", "Advertising", "Packaging"]', 'Branding');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_graphic AND question_text = 'Industry-standard software for photo editing:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_graphic, 'Adobe Tool', 'multiple_choice', 'Industry-standard software for photo editing:', '["Illustrator", "InDesign", "Photoshop", "Premiere Pro"]', 'Photoshop');
  END IF;

  -- Product Design
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'What does UX stand for?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'UX meaning', 'multiple_choice', 'What does UX stand for?', '["User Extension", "User Experience", "Universal X-platform", "Underneath X-design"]', 'User Experience');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'An interactive model of a product used for testing is a prototype.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'Prototyping', 'true_false', 'An interactive model of a product used for testing is a prototype.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'A fictional character created to represent a user type that might use a site or product:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'User Persona', 'multiple_choice', 'A fictional character created to represent a user type that might use a site or product:', '["User Persona", "User Profile", "Actor", "Customer Segment"]', 'User Persona');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'What does UI stand for?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'UI meaning', 'multiple_choice', 'What does UI stand for?', '["User Integration", "Universal Identity", "User Interface", "Unit Interaction"]', 'User Interface');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'Design thinking is a linear process that must always be followed in order.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'Design Thinking', 'true_false', 'Design thinking is a linear process that must always be followed in order.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'A low-fidelity visual representation of a product''s interface:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'Wireframing', 'multiple_choice', 'A low-fidelity visual representation of a product''s interface:', '["Mockup", "Prototype", "Wireframe", "High-fidelity design"]', 'Wireframe');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'Product design should consider users with disabilities to be truly inclusive.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'Accessibility', 'true_false', 'Product design should consider users with disabilities to be truly inclusive.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'Evaluating a product by testing it with representative users:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'Usability Testing', 'multiple_choice', 'Evaluating a product by testing it with representative users:', '["Usability Testing", "Unit Testing", "A/B Testing", "Stress Testing"]', 'Usability Testing');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'Characteristics of an object which, when perceived, suggest how it can be used:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'Affordance', 'multiple_choice', 'Characteristics of an object which, when perceived, suggest how it can be used:', '["Signifier", "Feedback", "Affordance", "Constraint"]', 'Affordance');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_product AND question_text = 'Iterative design involves cyclic prototyping, testing, analyzing, and refining a product.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_product, 'Iterative Design', 'true_false', 'Iterative design involves cyclic prototyping, testing, analyzing, and refining a product.', '["True", "False"]', 'True');
  END IF;

  -- Web Development (Backend)
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'The backend is responsible for:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'Backend purpose', 'multiple_choice', 'The backend is responsible for:', '["User interface layout", "Client-side animations", "Browser compatibility", "Server-side logic and database interactions"]', 'Server-side logic and database interactions');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'API stands for:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'API meaning', 'multiple_choice', 'API stands for:', '["Advanced Protocol Integration", "Application Programming Interface", "Automated Process Instruction", "Apple Programming Index"]', 'Application Programming Interface');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'PostgreSQL is an example of a relational database.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'SQL Database', 'true_false', 'PostgreSQL is an example of a relational database.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'A runtime environment that allows JavaScript to run on the server:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'Node.js', 'multiple_choice', 'A runtime environment that allows JavaScript to run on the server:', '["React", "Node.js", "Python", "Docker"]', 'Node.js');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'Which HTTP method is typically used to create a new resource?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'HTTP Methods', 'multiple_choice', 'Which HTTP method is typically used to create a new resource?', '["GET", "POST", "PUT", "DELETE"]', 'POST');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'Secrets like database keys should be stored directly in the source code.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'Environment Variables', 'true_false', 'Secrets like database keys should be stored directly in the source code.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'The process of verifying who a user is:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'Authentication', 'multiple_choice', 'The process of verifying who a user is:', '["Authorization", "Accounting", "Encryption", "Authentication"]', 'Authentication');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'Which of the following is a cloud infrastructure provider?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'Cloud Provider', 'multiple_choice', 'Which of the following is a cloud infrastructure provider?', '["VS Code", "GitHub", "AWS", "Stack Overflow"]', 'AWS');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'REST is an architectural style for providing standards between computer systems on the web.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'REST', 'true_false', 'REST is an architectural style for providing standards between computer systems on the web.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_backend AND question_text = 'Standard HTTP status code for "Not Found":') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_backend, 'Server response', 'multiple_choice', 'Standard HTTP status code for "Not Found":', '["200", "500", "403", "404"]', '404');
  END IF;

  -- Web Development (Frontend)
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'What is the primary role of HTML in a web page?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'HTML purpose', 'multiple_choice', 'What is the primary role of HTML in a web page?', '["Styling and layout", "Structure and content", "Client-side logic", "Server management"]', 'Structure and content');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'What does CSS stand for?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'CSS meaning', 'multiple_choice', 'What does CSS stand for?', '["Computer Style Selection", "Creative System Software", "Cascading Style Sheets", "Complex Syntax Structure"]', 'Cascading Style Sheets');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'JavaScript is used to add interactivity to web pages.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'JavaScript', 'true_false', 'JavaScript is used to add interactivity to web pages.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'React is a popular frontend library built by:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'React', 'multiple_choice', 'React is a popular frontend library built by:', '["Google", "Microsoft", "Meta (Facebook)", "Amazon"]', 'Meta (Facebook)');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'Responsive design ensures a website looks good on all devices (mobile, tablet, desktop).') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'Responsive Design', 'true_false', 'Responsive design ensures a website looks good on all devices (mobile, tablet, desktop).', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'What does DOM stand for?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'DOM', 'multiple_choice', 'What does DOM stand for?', '["Dynamic Output Management", "Data Object Mapping", "Document Object Model", "Direct Operation Method"]', 'Document Object Model');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'Flexbox is used for:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'CSS Flexbox', 'multiple_choice', 'Flexbox is used for:', '["One-dimensional layouts", "Two-dimensional layouts", "Database queries", "Server-side rendering"]', 'One-dimensional layouts');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'Tailwind CSS is a utility-first CSS framework.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'Tailwind CSS', 'true_false', 'Tailwind CSS is a utility-first CSS framework.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'Which software is used to view websites?') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'Web Browser', 'multiple_choice', 'Which software is used to view websites?', '["Operating System", "Compiler", "Web Browser", "IDE"]', 'Web Browser');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_frontend AND question_text = 'Using semantic HTML (like <header>, <main>) improves accessibility and SEO.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_frontend, 'SEO accessibility', 'true_false', 'Using semantic HTML (like <header>, <main>) improves accessibility and SEO.', '["True", "False"]', 'True');
  END IF;

  -- Soft Skills
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'Active listening involves:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Effective Communication', 'multiple_choice', 'Active listening involves:', '["Preparing your response while others speak", "Paying full attention and providing feedback", "Interrupting with clarifying questions", "Looking at your phone"]', 'Paying full attention and providing feedback');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'Collaboration means working together towards a shared goal.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Teamwork', 'true_false', 'Collaboration means working together towards a shared goal.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'The ability to understand and manage your emotions and those of others is:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Emotional Intelligence', 'multiple_choice', 'The ability to understand and manage your emotions and those of others is:', '["IQ", "Emotional Intelligence", "Cognitive Ability", "Social Status"]', 'Emotional Intelligence');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'Constructive feedback should be specific, timely, and focused on behavior.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Constructive Feedback', 'true_false', 'Constructive feedback should be specific, timely, and focused on behavior.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'A popular technique for time management using 25-minute focus intervals:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Time Management', 'multiple_choice', 'A popular technique for time management using 25-minute focus intervals:', '["Scrum", "Kanban", "Agile", "Pomodoro Technique"]', 'Pomodoro Technique');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'The first step in resolving a conflict should usually be:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Conflict Resolution', 'multiple_choice', 'The first step in resolving a conflict should usually be:', '["Finding someone to blame", "Understanding different perspectives", "Ignoring the issue", "Winning the argument"]', 'Understanding different perspectives');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'Adaptability is the ability to adjust to new conditions and challenges.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Adaptability', 'true_false', 'Adaptability is the ability to adjust to new conditions and challenges.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'True leadership is characterized by:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Leadership', 'multiple_choice', 'True leadership is characterized by:', '["Micromanaging tasks", "Empowering and inspiring others", "Having the loudest voice", "Always taking the credit"]', 'Empowering and inspiring others');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'Empathy means feeling exactly what another person is feeling.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Empathy', 'true_false', 'Empathy means feeling exactly what another person is feeling.', '["False", "True"]', 'False');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_soft AND question_text = 'Critical thinking is essential for:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_soft, 'Problem Solving', 'multiple_choice', 'Critical thinking is essential for:', '["Rote memorization", "Following instructions blindly", "Effective problem solving", "Avoiding change"]', 'Effective problem solving');
  END IF;

  -- Job Readiness
  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'The main purpose of a CV is to:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'CV/Resume', 'multiple_choice', 'The main purpose of a CV is to:', '["Get the job immediately", "List every job you have ever had", "Secure an interview", "Show your personal hobbies"]', 'Secure an interview');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'Networking is about building mutually beneficial professional relationships.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'Professional Networking', 'true_false', 'Networking is about building mutually beneficial professional relationships.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'A cover letter should:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'Cover Letter', 'multiple_choice', 'A cover letter should:', '["Repeat your CV word for word", "Show how your skills match the job requirements", "Be at least 3 pages long", "Include your salary demands"]', 'Show how your skills match the job requirements');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'You should research the company before attending an interview.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'Interview Prep', 'true_false', 'You should research the company before attending an interview.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'STAR stands for Situation, Task, Action, and:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'STAR Method', 'multiple_choice', 'STAR stands for Situation, Task, Action, and:', '["Review", "Report", "Repeat", "Result"]', 'Result');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'Professional behavior in the workplace includes:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'Workplace Etiquette', 'multiple_choice', 'Professional behavior in the workplace includes:', '["Sharing office gossip", "Always being the last to arrive", "Punctuality and respect", "Ignoring emails"]', 'Punctuality and respect');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'LinkedIn is commonly used for professional networking.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'Digital Presence', 'true_false', 'LinkedIn is commonly used for professional networking.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'Believing that abilities can be developed through dedication and hard work is:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'Growth Mindset', 'multiple_choice', 'Believing that abilities can be developed through dedication and hard work is:', '["Fixed Mindset", "Overconfidence", "Growth Mindset", "Optimism"]', 'Growth Mindset');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'A portfolio is a collection of work samples used to demonstrate skills and experience.') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'Portfolio', 'true_false', 'A portfolio is a collection of work samples used to demonstrate skills and experience.', '["True", "False"]', 'True');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM questions WHERE category_id = cat_job AND question_text = 'Employers value soft skills because they:') THEN
    INSERT INTO questions (category_id, title, type, question_text, options, correct_answer) VALUES
    (cat_job, 'Soft skills in hiring', 'multiple_choice', 'Employers value soft skills because they:', '["Are easier to test than technical skills", "Are listed first on your CV", "Determine how well you work with others", "Require no training"]', 'Determine how well you work with others');
  END IF;

END $$;
