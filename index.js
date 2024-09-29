// YOU CAN USE THIS FILE AS REFERENCE FOR SERVER DEVELOPMENT

// include the express modules
var express = require("express");

// create an express application
var app = express();
const url = require('url');
const qs = require('querystring');
const path = require('path');

// helps in extracting the body portion of an incoming request stream
var bodyparser = require('body-parser');

// fs module - provides an API for interacting with the file system
var fs = require("fs");

// helps in managing user sessions
var session = require('express-session');

// include the mysql module
var mysql = require("mysql");

// Bcrypt library for comparing password hashes
const bcrypt = require('bcrypt');

// A possible library helps reading uploaded file.
var formidable = require('formidable')

var logged_in = false;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// apply the body-parser middleware to all incoming requests
app.use(bodyparser());

// use express-session
// in mremory session is sufficient for this assignment
app.use(session({
    secret: "csci4131secretkey",
    saveUninitialized: true,
    resave: false
}
));

var connection = mysql.createConnection({
    host: "cse-mysql-classes-01.cse.umn.edu",
    user: "C4131NF23U76",
    password: "XXXX",
    database: "C4131NF23U76",
    port: 3306
});

connection.connect(function (err) {
    if (err) {
        throw err;
    };
    console.log("Connected to MYSQL database!");
});

// server listens on port 9007 for incoming connections
app.listen(1942, () => console.log('Listening on port 1942!'));


// function to return the welcome page
app.get('/', function (req, res) {
    res.render('welcome');
});

app.get('/index.html', function (req, res) {
    res.render('welcome');
});


app.get('/login', function (req, res) {
    if (logged_in) {
        res.render('schedule');
    }
    else {
        res.render('login');
    }
});

app.get('/createAccount', function (req, res) {
    if (logged_in) {
        res.redirect(302, '/schedule');
    }
    else {
        res.render('newAccount');
    }
});

app.get('/logout', function (req, res) {
    req.session.destroy((err) => {
        if (err) {
            console.error('Destroying session Failed:', err);
        } else {
            logged_in = false;
            console.log("Logout Successful");
            res.redirect('/login');
        }
    });
});

app.get('/schedule', function (req, res) {
    if (logged_in) {
        res.render('schedule');

    }
    else {
        res.render('login');
    }
});

app.get('/schedule.html', function (req, res) {
    if (logged_in) {
        res.render('schedule');

    }
    else {
        res.render('login');
    }
});

app.get('/getSchedule', (req, res) => {
    const day = req.query.day;

    var query = "SELECT event_id AS id, event_event AS name, event_start AS start, event_end AS end, event_location AS location, event_phone AS phone, event_info AS info, event_url AS url FROM tbl_events WHERE event_day = '" + day + "'" + "ORDER BY event_start";
    connection.query(query, function (err, rows, fields) {
        if (err) {
            console.log("Error: " + "Connection to tbl_events failed!");
        }
        var obj = JSON.stringify(rows);
        obj = JSON.parse(obj);
        res.status(200).json(obj);
    });
});

app.get('/addEvent.html', function (req, res) {
    if (logged_in) {
        res.render('addEvent');

    }
    else {
        res.render('login');
    }
});

app.post("/sendLoginDetails", function (req, res) {
    var username = req.body.username;
    var password = req.body.password;

    var query = "SELECT * FROM tbl_accounts WHERE acc_name = '" + username + "'";
    connection.query(query, function (err, rows, fields) {
        if (err) {
            console.log("Error: " + "Connection to tbl_accounts failed!");
            res.json({ status: "fail" });
        }
        if (rows.length >= 1) {
            if (bcrypt.compareSync(password, rows[0].acc_password)) {
                console.log("Login Successful");
                req.session.user = username;
                logged_in = true;
                res.json({ status: "success" });
            }
            else {
                res.json({ status: "fail" });
            }
        }
        else {
            res.json({ status: "fail" });
        }
    });
});

app.post("/register", function (req, res) {
    var email = req.body.email;
    var password = req.body.password;

    var query = "SELECT * FROM tbl_accounts WHERE acc_name = ?";
    connection.query(query, [email], function (err, rows, fields) {
        if (err) {
            console.log("Error: " + "Connection to tbl_accounts failed!");
            res.json({ status: "fail" });
        }
        if (rows.length >= 1) {
            console.log("Email has already been registered.");
            res.json({ status: "repeat" });
        }
        else {
            const query = 'INSERT INTO tbl_accounts (acc_name, acc_login, acc_password) VALUES (?, ?, ?)';
            const passwordHash = bcrypt.hashSync(password, 10);
            const values = [email, email, passwordHash];
            connection.query(query, values, function (err, rows, fields) {
                if (err) {
                    console.log("Error: " + "Connection to tbl_accounts failed!");
                    res.json({ status: "fail" });
                } else {
                    console.log("Account Created!");
                    logged_in = true;
                    res.json({ status: "success" });
                }
            });
        }
    });
});



app.post('/postEventEntry', function (req, res) {
    var reqBody = '';

    let postObj = req.body;
    var day = postObj.day;
    var name = postObj.event;
    var start = postObj.start;
    var end = postObj.end;
    var phone = postObj.phone;
    var location = postObj.location;
    var info = postObj.info;
    var url = postObj.url;

    var query = "INSERT INTO tbl_events (event_day, event_event, event_start, event_end, event_location, event_phone, event_info, event_url) VALUES ('" + day + "', '" + name + "', '" + start + "', '" + end + "', '" + location + "', '" + phone + "', '" + info + "', '" + url + "')";

    connection.query(query, function (err, rows, fields) {
        if (err) {
            console.log("Error: " + "Insert to tbl_accounts failed!");
            res.json({ status: "fail" });
        }
        res.redirect('/schedule');
    });
});

app.get(`/deleteEvent/:id`, function (req, res) {
    const rowId = req.params.id;
    if (req.session && logged_in) {
        var query = 'DELETE FROM tbl_events WHERE event_id = ?';
        connection.query(query, [rowId], function (err, results, fields) {
            if (err) {
                console.log("Event not exist");
                res.sendStatus(404);
            } else {
                console.log("Row " + rowId + " deleted");
                res.sendStatus(200);
            }
        });
    } else {
        res.redirect(302, '/login');
    }
});

app.get('/edit/:id', function (req, res) {
    const rowId = req.params.id;
    if (req.session && logged_in) {
        var query = 'SELECT * FROM tbl_events WHERE event_id = ?';
        connection.query(query, [rowId], function (err, results) {
            if (err) {
                throw err;
            } else {
                if (results.length === 0) {
                    console.log("Event not exist");
                    res.sendStatus(404);
                } else {
                    const editEvent = {
                        id: results[0].event_id,
                        day: results[0].event_day,
                        name: results[0].event_event,
                        start: results[0].event_start,
                        end: results[0].event_end,
                        location: results[0].event_location,
                        phone: results[0].event_phone,
                        info: results[0].event_info,
                        url: results[0].event_url
                    };
                    res.render('updateEvent', { record: editEvent });
                }
            }
        });
    } else {
        res.redirect(302, '/login');
    }
});

app.post('/updateEvent/:id', function (req, res) {
    var id = req.params.id;
    var data = req.body;
    if (req.session && logged_in) {
        var query = 'UPDATE tbl_events SET event_day = ?, event_event = ?, event_start = ?, event_end = ?, event_location = ?, event_phone = ?, event_info = ?, event_url = ? WHERE event_id = ?';
        connection.query(query, [data.day, data.event, data.start, data.end, data.location, data.phone, data.info, data.url, id], function (err, results) {
            if (err) {
                console.log("Update database failed!");
                res.sendStatus(422);
            } else {
                console.log("Row " + id + " updated!");
                res.redirect(302, '/schedule');
            }
        });
    } else {
        res.redirect(302, '/login');
    }
});


// middle ware to serve static files
app.use('/views', express.static(__dirname + '/views'));


// function to return the 404 message and error to client
app.get('*', function (req, res) {
    // add details
    res.sendStatus(404);
});
