var unirest = require("unirest");
var express = require("express");
var events = require("events");


var getFromApi = function(endpoint, args){
    /* Make call to Spotify web API documented here:
    https://developer.spotify.com/web-api/
    */
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        .end(function(response){
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};


var app = express();
app.use(express.static("public"));

app.get("/search/:name", function (req, res) {
   /*Make call to search endpoint. SEE documentation:
   https://developer.spotify.com/web-api/search-item/
   */
   var searchReq = getFromApi("search", {
       q: req.params.name,
       limit: 1,
       type: "artist"
   });
   
   searchReq.on('end', function (item) {
       
       var artist = item.artists.items[0];
       /*Make call to related artists endpoint. SEE external documentation:
       https://developer.spotify.com/web-api/get-related-artists/
       */
       var ep = 'artists/' + artist.id +'/related-artists';
       var relatedArtistsReq = getFromApi(ep, {});
       relatedArtistsReq.on('end', function(item) {
           artist.related = item.artists;
           var artistsCompleted =0;
           var checkComplete = function() {
               if (artistsCompleted === artist.related.length) {
                   console.log(artistsCompleted);
                   console.log(artist);
                   res.json(artist);                   
               }
           }           
        //   console.log(artist.related);
        
           artist.related.forEach(function (relatedArtist, index) {
            //   console.log(relatedArtist.name)
               /*Make call to top tracks endpoint. SEE external documentation:
               https://developer.spotify.com/web-api/get-artists-top-tracks/
               */               
               var topTracksEp = 'artists/' + relatedArtist.id + '/top-tracks';
               var topTracksReq = getFromApi(topTracksEp, {"country": "US"});
               
               topTracksReq.on('end', function(item) {
                   artist.related[index].tracks = item.tracks;
                   artistsCompleted += 1;
                   checkComplete();
                //   console.log('first track for', relatedArtist.name, ':', item.tracks[0]['name'])
                   
               });
           });
           

       });
       relatedArtistsReq.on('error', function(code) {
           res.sendStatus(code);
       });       
   });
   
   searchReq.on('error', function(code) {
       res.sendStatus(code);
   });
});

app.listen(8080);