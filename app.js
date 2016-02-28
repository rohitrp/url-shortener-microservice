var express = require('express')
  , mongo = require('mongodb').MongoClient
  , url = "mongodb://localhost:27017/freecodecamp"
  , app = express()
  , port = process.env.PORT || 3000

app.use('/', express.static(__dirname + '/public'))

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/index.html')
})

mongo.connect(url, function(err, db) {
  if (err) throw err
  
  var collection = db.collection('urls')
  
  collection.insert({
    original_url: '',
    short_url: ''
  }, function(err) {
    if (err) throw err
    db.close()
  })
})

app.listen(port, function(err) {
  console.log('Listening at port ' + port + '...')
})