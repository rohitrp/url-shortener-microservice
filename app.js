var express = require('express')
  , url = require('url')
  , mongo = require('mongodb').MongoClient
  , mongoUrl = "mongodb://localhost:27017/freecodecamp"
  , app = express()
  , port = process.env.PORT || 3000

app.use('/', express.static(__dirname + '/public'))

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/index.html')
})

app.get('/new/*', function(req, res) {
  var original_url = url.parse(req.url, true).path.replace('\/new\/', '')
  
  mongo.connect(mongoUrl, function(err, db) {
    if (err) throw err

    var collection = db.collection('urls')
    
    collection.findOneAndUpdate(
      { _id: 'urlId' },
      { $inc: { sequence_value: 1 }},
      {
        upsert: true,
        returnNewDocument: true
      },
      function(err, updated) {

        collection.insert({
          
          _id: updated.value.sequence_value,
          original_url: original_url,
          short_url: idToShortUrl(updated.value.sequence_value)
          
        }, function(err) {
          if (err) throw err
          db.close()
        })
      }
    )
  })

})

function idToShortUrl(id) {
  var map = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    , shortUrl = []
  
  while (id) {
    shortUrl.unshift(map.charAt(id % 62))
    id = Math.floor(id / 62)
  }
  
  return shortUrl.join('')
}

// Route to initialize the sequence counter
app.get('/init', function(req, res) {
  mongo.connect(mongoUrl, function(err, db) {
    db.collection('urls').insert({
      _id: 'urlId',
      sequence_value: 0
    }, function(err) {
      if (err) throw err
      db.close()
    })
  })
})

function shortUrltoId(original_url) {
  var id = 0
  
  for (var i = 0; i < original_url.length; i++) {
    var ch = original_url.charAt(i)
    
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