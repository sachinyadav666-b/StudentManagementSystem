const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const path = require("path");
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const encoder = bodyParser.urlencoded();
const cors = require('cors');



const app = express();
app.use(express.json());
app.use(cors());

// Serve the root directory as a static directory
// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views folder to the root directory (globally)
app.set('views', path.join(__dirname));  //  root folder
app.use(express.static(path.join(__dirname,'views')));

// Static files
app.use(express.static("public"));
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key', // 
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, httpOnly: true, httpOnly: true,
        sameSite: 'strict'
    }, // 
}));

const port = 4000;



// MySQL database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sachin@@@rama123',
    database: 'loginfo',
});

db.connect((error) => {
    if (error) {
        console.error("Error connecting to MySQL database:", error);
        throw error;
    }
    console.log('Connected to MySQL database');
});

// Routes
app.get('/', (req, res) => {
    console.log("good");
    res.sendFile(path.join(__dirname + "/index.html"));
});

// signup route
app.get('/signup', (req, res) => {
    res.sendFile(__dirname + "/signup.html");
});

// attendance route
app.get('/attendance', (req, res) => {
    res.render("attendance.ejs");
});

app.post("/", encoder, async (req, res) => {
    const { rno, password } = req.body;

    // Debugging: Check if `rno` and `password` are being received
    console.log("Request Body:", req.body);

    if (!rno || !password) {
        res.send(`
            <script>
                alert("Please provide both RUM number and password or incorrect");
                window.location.href = "/";
            </script>
        `);
        return;
    }

    db.query(
        "SELECT * FROM loguser WHERE rno = ?",
        [rno],
        async (error, results) => {
            if (error) {
                console.error("Database query error:", error);
                res.status(500).send("Internal Server Error");
                return;
            }

            if (results.length > 0) {
                const user = results[0];
                const isPasswordMatch = await bcrypt.compare(password, user.pass);

                if (isPasswordMatch) {
                    req.session.user = { id: user.id, name: user.name };
                    res.send(`
                        <script>
                            alert("Login successful! Redirecting on Your Profile");
                            window.location.href = "/welcome";
                        </script>
                    `);
                } else {
                    res.send(`
                        <script>
                            alert("Invalid Rum & password. Please try again.");
                            window.location.href = "/";
                        </script>
                    `);
                }
            } else {
                res.send(`
                    <script>
                        alert("Invalid RUM number or password.");
                        window.location.href = "/";
                    </script>
                `);
            }
        }
    );
});






// extracting data from the user
app.post("/signup", encoder, async (req, res) => {
    // Extract form data
    const {
        fullname,
        Mno,
        Email,
        Rno,
        Fathern,
        mothern,
        erno,
        dob,
        category,
        address,
        admitdate,
        courseyr,
        board,
        password,
        "confirm-password": confirmPassword,
    } = req.body;

    // Validate that the passwords match
    if (password !== confirmPassword) {
        res.send(`
            <script>
                alert("Passwords do not match with confirm password. Please try again.");
                window.location.href = "/signup";
            </script>
        `);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 3);

    // Insert data into the database
    const query = `
        INSERT INTO loguser (name, mno, email, rno, fathern, mothern, erno, dob, country, State, city, courseyr,board, pass)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        query,
        [fullname, Mno, Email, Rno, Fathern, mothern, erno, dob, category, address, admitdate, courseyr, board, hashedPassword],
        (error, results) => {
            if (error) {
                console.error("Error inserting data into database:", error);
                res.status(500).send("Internal database Error pls create a unique Rum-no, enrollment-no because it has allready taken by other students");
                return;
            }

            // Send success response
            res.send(`
                <script>
                    alert("Registration successful! You can now log in.");
                    window.location.href = "/";
                </script>
            `);
        }
    );
});

// API endpoint to get countries
app.get('/getCountries', (req, res) => {
    const query = 'SELECT * FROM countries';

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching countries', error: err });
        }

        // Send the countries data as JSON
        console.log(results);
        res.json(results);
    });
});

//To get states based on country
app.get('/getStates', (req, res) => {
    const countryId = req.query.countryId;
    const query = 'SELECT id, stateNames FROM states WHERE country_id = ?';

    db.query(query, [countryId], (err, results) => {
        if (err) throw err;
        console.log(results);
        res.json(results);
    });
});

//Api To getting cities form cities table based on state
app.get('/getCities', (req, res) => {
    const stateId = req.query.stateId;
    const query = 'SELECT id, cityNames FROM cities WHERE state_id = ?';

    db.query(query, [stateId], (err, results) => {
        if (err) throw err;
        console.log(results);
        res.json(results);
    });
});

// When login is successful
app.get("/welcome", (req, res) => {
    console.log("bye");
    res.sendFile(path.join(__dirname + "/welcome.html"));
});



// This api fetching the data of loged in user and used in welcome file for filling the data in user details
app.get('/api/user', (req, res) => {
    const user = req.session?.user; //  session holds user data
    console.log(user);
    if (!user) {
        res.status(401).json({ error: 'Unauthorized access' });
        return;
    }

    // Query getting loged in user details from database
    db.query("SELECT * FROM loguser WHERE id = ?", [user.id], (error, results) => {
        if (error) {
            console.error("Database error:", error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});


// Update profile this api is fetching the user updated details from script file of welcome page and update user data in database
app.put('/api/update-profile', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized: Please log in first.' });
    }

    const userRno = req.session.user.id; // Assuming the RUM number is stored in the session during login
    console.log(userRno);
    const {
        name,
        dob,
        fathern,
        mothern,
        email,
        mno,
        category,
        address,
        erno,
        admitdate,
        courseyr,
        board
    } = req.body;

    console.log(category);

    const query = `
        UPDATE loguser
        SET name = ?, dob = ?, fathern = ?, mothern = ?, email = ?, mno = ?, country = ?, 
            State = ?, erno = ?, city = ?, courseyr = ?, board = ?
        WHERE id = ?
    `;

    const values = [name, dob, fathern, mothern, email, mno, category, address, erno, admitdate, courseyr, board, userRno];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to update profile.' });
        }
        res.status(200).json({ message: 'Profile updated successfully.' });
    });
});

// Reset Password api which get email from forget password form and update password through user email which save in database
app.post('/reset-password', async (req, res) => {
    const { email, password } = req.body;

    // checking Inputs
    if (!email || !password) {
        return res.status(400).json({ message: "Email and Password are required." });
    }

    // Check  email exists or not
    db.query("SELECT * FROM loguser WHERE email = ?", [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error." });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Wrong Email id." });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Updating the password in the database
        db.query("UPDATE loguser SET pass = ? WHERE email = ?", [hashedPassword, email], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Failed to reset password." });
            }

            // res.json({ message: "Password reset successfully." });
            res.send(`
                <script>
                    alert("Password reset successful!");
                    window.location.href = "/";
                </script>
            `);
        });
    });
});

// Starting the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


