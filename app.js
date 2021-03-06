var express = require('express')
  , url = require('url')
  , http = require('http')
  , request = require('request')
  , mongo = require('mongodb').MongoClient
  , mongoUrl = process.env.MONGO || "mongodb://localhost:27017/freecodecamp"
  , app = express()
  , port = process.env.PORT || 3000
  , host = process.env.HOST_URL || "http://localhost:3000/"

app.use('/', express.static(__dirname + '/public'))

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/index.html')
})

// Route to initialize the sequence counter
app.get('/init', function(req, res) {
  mongo.connect(mongoUrl, function(err, db) {
    var collection = db.collection('urls')
    
    collection.remove({})
    
    collection.insert({
      _id: 'urlId',
      sequence_value: 0
    }, function(err) {
      if (err) throw err
      db.close()
      res.end("Database initialized")
    })
  })
})

app.get('/new/*', function(req, res) {

  var original_url = 'http://' + url.parse(req.url, true).path.replace(/\/new\/|http:\/\/|https:\/\//gi, '')
  
  console.log(original_url)
  
  checkUrlExists(original_url, res, insertData)  
  
})

app.get('/*', function(req, res) {
  var short_url = url.parse(req.url, true).pathname.replace('/', '')
  
  mongo.connect(mongoUrl, function(err, db) {
    var collection = db.collection('urls')
    
    collection.find({
      short_url: short_url
    }, {
      _id: 0,
      original_url: 1,
      short_url: 1
    }).toArray(function(err, data) {
      if (data.length == 0) {
        res.json({
          error: "Invalid short URL"
        })
      } else {
        res.redirect(data[0].original_url)
      }
    })
  })
})

function insertData(res, original_url) {
  mongo.connect(mongoUrl, function(err, db) {
    if (err) throw err

    var collection = db.collection('urls')
    
    collection.find({
      original_url: original_url
    }, {
      _id: 0,
      original_url: 1,
      short_url: 1
    }).toArray(function(err, data) {
      if (data.length == 0) {
        collection.findOneAndUpdate(
          { _id: 'urlId' },
          { $inc: { sequence_value: 1 }},
          function(err, updated) {

            collection.insert({

              _id: updated.value.sequence_value,
              original_url: original_url,
              short_url: idToShortUrl(updated.value.sequence_value)

            }, function(err) {
              if (err) throw err
              db.close()
              res.json({
                original_url: original_url,
                short_url: host + idToShortUrl(updated.value.sequence_value)
              })
            })
          }
        )
      } else {
        db.close()
        res.json({
          original_url: data[0].original_url,
          short_url: host + data[0].short_url
        })
      }   
    })
  })
}

function checkUrlExists(original_url, parent_res, callback) {
  request(encodeURI(original_url), function (err, res) {
    if (!err && res.statusCode >= 200 && res.statusCode < 400) {
      console.log("exists")
      callback(parent_res, original_url)
    } else {
      console.log("does not exist")
      parent_res.json({
        error: "Invalid URL"
      })
    }
  })
}

function idToShortUrl(id) {
  var map = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    , shortUrl = []
  
  do {
    shortUrl.unshift(map.charAt(id % 62))
    id = Math.floor(id / 62)
  } while(id)
  
  return shortUrl.join('')
}

function shortUrltoId(short_url) {
  var id = 0
  
  for (var i = 0; i < short_url.length; i++) {
    var ch = short_url.charAt(i)
    
    if ('a' <= ch && ch <= 'z') {
      id = id * 62 + ch.charCodeAt(0) - 'a'.charCodeAt(0)
    } else if ('A' <= ch && ch <= 'Z') {
      id = id * 62 + ch.charCodeAt(0) - 'A'.charCodeAt(0) + 26
    } else if ('0' <= ch && ch <= '9') { 
      id = id * 62 + ch - '0'
    }
  }
  
  return id
}

app.listen(port, function(err) {
  console.log('Listening at port ' + port + '...')
})