create database researchhub;
USE researchhub;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    role ENUM('student', 'faculty') NOT NULL,

    institution VARCHAR(150) NOT NULL,

    course VARCHAR(100) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ----------------------------------------

select *from users;
-- ------------------------------------------
CREATE TABLE repositories (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT NOT NULL,

    domain VARCHAR(100) NOT NULL,

    research_type ENUM('individual', 'group') NOT NULL,

    privacy ENUM('private', 'shared') NOT NULL,

    owner_id INT NOT NULL,

    status ENUM('ongoing', 'completed', 'archived')
        DEFAULT 'ongoing',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
-- -------------------------------------------------------

CREATE TABLE student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL UNIQUE,

    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),

    enrollment_number VARCHAR(100),

    specialization VARCHAR(150),

    year INT,
    semester INT,

    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),

    research_interests TEXT,
    skills TEXT,
    bio TEXT,

    profile_completed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ---------------------------------
select *from student_profiles;

truncate table student_profiles;