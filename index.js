const express = require('express'),
    axios = require('axios').default,
    app = express(),
    CircularJSON = require('circular-json'),
    rawConfig = require("./config.json"),
    config = JSON.parse(JSON.stringify(rawConfig)), useragent = require('express-useragent'),
    cookieParser = require('cookie-parser'),
    { uri, db, masterPassword } = require("./config.json"),
    { MongoClient } = require("mongodb"),
    shajs = require("sha.js"),
    cors = require("cors");

let userSiteTokens = [],
    userSiteAddrs = [];

const corsOptions = {
    origin: config.servURL,
    optionsSuccessStatus: 200
}

app.use(useragent.express());
app.use(express.json());
app.use(cookieParser());
app.use(express.static('./router/html'));

async function findTargetURL(token) {
    let client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        await client.connect();

        const database = client.db(db);
        const collection = database.collection("accounts");

        const searchQuery = await collection.findOne({ token: token });

        if (searchQuery == null || searchQuery == undefined || searchQuery == "") {
            return(undefined);
        } else {
            return(JSON.parse(JSON.stringify(searchQuery))["targetURL"]);
        }
    } catch (e) {
        return (e);
    } finally {
        await client.close();
    }
}


async function setupMaster() {
    let client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        await client.connect();

        const database = client.db(db);
        const collection = database.collection("settings");

        const search = await collection.findOne({ dataFor: "HTTPassThru" });

        if (search === null || search === undefined || search === "") {
            let welcome = "https://goldenrod-tarry-quart.glitch.me";
            await collection.insertOne({ dataFor: "HTTPassThru", rootURL: welcome});
            return(welcome);
        } else {
            return(JSON.parse(JSON.stringify(search))["rootURL"]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

let masterURL;

(async () => {
    console.log("[init]> Getting Root URL...")
    masterURL = await setupMaster();
    console.log("[init]> Root URL has been recieved!")
})();

app.get("/*", cors(), async function (req, restwo) {
    const token = JSON.parse(JSON.stringify(req.cookies))["token"];
    let url = masterURL;
    let index = userSiteTokens.indexOf(token)

    if (index == -1) {
        let finder = await findTargetURL(token);
      
        if (finder !== undefined && finder !== "base") {
            userSiteTokens.push(token);
            userSiteAddrs.push(finder);

            url = finder;
        }
    } else {
        url = userSiteAddrs[index];
    }

    console.log("recieved request for " + url + req.originalUrl)

    let senderString = "";
    let senderCode = 404;
    let magic = "";

    const options = {
        "headers": {
            "User-Agent": req.useragent
        }
    };

    await axios.get(url + req.originalUrl, options)
        .then(function (response) {
            try {
              magic = response.headers['content-type'].split(";")[0]; //to get mime types :flushed:
            } catch (e) {
              magic = "text/html";
            }
      
            senderString = JSON.parse(CircularJSON.stringify(response)).data;
            senderCode = 200;
        }).catch(function (error) {
            console.error(error);

            const circJSON = JSON.parse(CircularJSON.stringify(error));

            if (circJSON == null || circJSON == undefined) {
                senderCode = 500;
                senderString = "HTTPassThru Error";
            } else {
                senderCode = 404;
                senderString = "Error on " + url;

                if (error.response) {
                  if (error.response.data && error.response.senderCode) {
                    senderString = error.data;
                    senderCode = error.response.status;
                  }
                }
            }
        });

    senderString = senderString.toString().replaceAll(url, config.servURL);
  
    //Below are some workarounds to get some sites displaying & working correctly.
    restwo.type(magic);
    restwo.set("Content-Security-Policy", "upgrade-insecure-requests"); 

    console.log("shipping request for " + url + req.originalUrl)
    restwo.status(senderCode).send(senderString);
})

//BEGIN adminAPI

async function addUser(token, uname) {
    console.log(uri);
    let client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        await client.connect();

        const database = client.db(db);
        const collection = database.collection("accounts");

        const signcheck = await collection.findOne({ token: token });

        if (signcheck === null || signcheck === undefined || signcheck === "") {
            const usercheck = await collection.findOne({ uname: uname });
            if (usercheck === null || usercheck === undefined || usercheck === "") {
                var result = await collection.insertOne({ token: token, uname: uname, targetURL: "base" })
                return (result)
            } else {
                return ("Someone has the same username!")
            }
        } else {
            return ("User exists!")
        }
    } catch (e) {
        return (e)
    } finally {
        await client.close()
    }
}

async function logIn(token) {
    let client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        await client.connect();

        const database = client.db(db);
        const collection = database.collection("accounts");

        const signcheck = await collection.findOne({ token: token });
        if (signcheck === null || signcheck === undefined || signcheck === "") {
            return ("User doesn't exist!")
        } else {
            var json2 = JSON.parse(JSON.stringify(signcheck))
            return (json2.token)
        }
    } catch (e) {
        return (e)
    } finally {
        await client.close()
    }
}

async function updateRoot(url) {
    let client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        await client.connect();

        const database = client.db(db);
        const collection = database.collection("settings");

        console.log(await collection.replaceOne({ dataFor: "HTTPassThru" }, { dataFor: "HTTPassThru", rootURL: url }));
    } catch (e) {
        return (e);
    } finally {
        await client.close();
    }
}

async function updateAccountURL(url, token) {
    let client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        await client.connect();

        const database = client.db(db);
        const collection = database.collection("accounts");

        const tokenCheck = await collection.findOne({ token: token });
        console.log(tokenCheck);

        if (tokenCheck == null || tokenCheck == undefined || tokenCheck == "") {
            return("User doesn't exist!");
        } else {
            let temp = tokenCheck;
            temp.targetURL = url;
            console.log(temp)

            console.log(await collection.replaceOne({ token: token }, temp));

            return(true);
        }
    } catch (e) {
        return (e);
    } finally {
        await client.close();
    }
}

app.post('/httpassthru/api/changeaccounturl', async (req, res) => {
    let data = JSON.parse(JSON.stringify(req.body));
    let token = JSON.parse(JSON.stringify(req.cookies))["token"];

    if (token == null || token == undefined) {
        token = data.token;
    }
    if (req.body == "" || token == "" || token == null || data.url == "" || data.url == null) {
        res.status(418).send({
            message: "Missing data"
        })
    } else {
        let resp = await updateAccountURL(data.url, token);

        if (resp) {
            let index = userSiteTokens.indexOf(token);

            if (index != -1) {
                await userSiteTokens.splice(index, 1);
                await userSiteAddrs.splice(index, 1);

                res.status(200).send({
                    message: "OK"
                })
            } else {
                res.status(418).send({
                    message: "Updated successfully, but there was an error auto-updating the cache!"
                })
            }
        } else {
            res.status(418).send({
                message: "Token invalid or there was an error!"
            })
        }
    }
})

app.post('/httpassthru/api/modifyrooturl', async (req, res) => {
    let data = JSON.parse(JSON.stringify(req.body));

    if (req.body == "" || data.pass == "" || data.pass == null || data.url == "" || data.url == null) {
        res.status(418).send({
            message: "Missing data"
        })
    } else {
        if (data.pass == masterPassword) {
            await updateRoot(data.url);

            console.log("[init]> Update detected! Getting Root URL...");
            masterURL = await setupMaster();
            console.log("[init]> Root URL has been updated!");

            res.status(200).send({
                message: "Successfully updated!"
            })
        } else {
            res.status(418).send({
                message: "Incorrect root password!"
            })
        }
    }
})

app.post('/httpassthru/api/signup', async (req, res) => {
    let data = JSON.parse(JSON.stringify(req.body));

    if (req.body == "" || data.pass == "" || data.pass == null || data.uname == "" || data.uname == null) {
        res.status(418).send({
            message: "Missing data"
        })
    } else {
        const badChars = [";", ":", "SELECT", "*", "/", "%", "eval"]
        let password = data.pass;
        let username = data.uname;
        badChars.forEach(function (entry) {
            if (password.includes(entry)) {
                res.status(400).send({
                    message: "Invalid characters in password!"
                })
                throw ("FAIL")
            } else if (username.includes(entry)) {
                res.status(400).send({
                    message: "Invalid characters in password!"
                })
            }
        });
        username = username.toLowerCase();
        const imGonnaPreToken = `${username}:${password}`
        const token = new shajs.sha512().update(imGonnaPreToken).digest('hex')
        const result = await addUser(token, username)
        if (result == "User exists!" || result == "Someone has the same username!") {
            res.status(400).send({
                message: result
            })
        } else {
            res.cookie('token', token);
            res.status(200).send({
                message: "OK!",
                token: token,
                uname: username
            })
        }
    }
});

app.post('/httpassthru/api/login', async (req, res) => {
    var data = JSON.parse(JSON.stringify(req.body));
    console.log(data);
    if (req.body == "" || data.pass == "" || data.pass == null || data.uname == "" || data.uname == null) {
        res.status(418).send({
            message: "Missing data"
        })
    } else {
        const badChars = [";", ":", "SELECT", "*", "/", "%", "eval"]
        let password = data.pass;
        let username = data.uname;
        badChars.forEach(function (entry) {
            if (username.includes(entry)) {
                res.status(400).send({
                    message: "Invalid characters in EMail!"
                })
                throw ("FAIL")
            } else if (password.includes(entry)) {
                res.status(400).send({
                    message: "Invalid characters in password!"
                })
                throw ("FAIL")
            }
        });
        username = username.toLowerCase();
        const imGonnaPreToken = `${username}:${password}`
        const token = new shajs.sha512().update(imGonnaPreToken).digest('hex')
        const result = await logIn(token)
        if (result === "User doesn't exist!") {
            res.status(400).send({
                message: "User doesn't exist!"
            })
        } else {
            res.cookie('token', token);
            res.status(200).send({
                message: "OK!",
                token: result
            })
        }
    }
});

//END adminAPI

app.listen(config.port);