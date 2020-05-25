const twit = require('twit');
const dotenv = require("dotenv");
const fs = require('fs');
const axios = require('axios');
const lodash = require('lodash');
const base64 = require('node-base64-image');
const dateFormat = require('dateformat');

dotenv.config();

const config = {
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token: process.env.access_token,
  access_token_secret: process.env.access_token_secret
};

let movieGenresList,showGenresList,languagesList,greetingsList,responseTweetContent;
const moviesEndPoint = 'https://api.themoviedb.org/3/discover/movie';
const showsEndPoint = 'https://api.themoviedb.org/3/discover/tv';

// Read and store all supported movie genres
fs.readFile('json/movieGenres.json', (err, data) => {
    if (err) throw err;
    movieGenresList = JSON.parse(data);
});

// Read and store all supported TV show genres
fs.readFile('json/showGenres.json', (err, data) => {
    if (err) throw err;
    showGenresList = JSON.parse(data);
});

// Read all languages
fs.readFile('json/languages.json', (err, data) => {
    if (err) throw err;
    languagesList = JSON.parse(data);
});

// Read all greetings
fs.readFile('json/greetings.json', (err, data) => {
    if (err) throw err;
    greetingsList = JSON.parse(data);
});

let Twitter = new twit(config);
let stream = Twitter.stream('statuses/filter', { track: '@MoviesShowsBot' });

let username, firstName, tweet, tweetID, contents, chosenGenre, chosenLanguage, imageEndpoint='https://cms-assets.tutsplus.com/uploads/users/48/posts/25888/image/2-movies-flat-icons-square.jpg';

stream.on('tweet', function(eventMsg) {

    // Username of the sender.
    username = eventMsg.user.screen_name;

    // First Name of the sender.
    firstName = eventMsg.user.name.split(' ')[0];

    // The Tweet content.
    tweet = eventMsg.text;

    // Tweet ID to which the response will be sent.
    tweetID  = eventMsg.id_str;

    // Creating an array of the tweet text. contents[0] = language, contents[1] = genre, contents[2] = type - movie or show.
    contents = lodash.startCase(lodash.toLower(tweet.substring('@MoviesShowsBot '.length))).split(' ');

    chosenLanguage = languagesList.find(language => language['english_name']===contents[0]);
    if(contents[2]==='Movie') {
        chosenGenre = movieGenresList.find(genre => genre['name']===contents[1]);
        getInitialData(moviesEndPoint);
    }
    else if(contents[2]==='Show') {
        chosenGenre = showGenresList.find(genre => genre['name']===contents[1]);
        getInitialData(showsEndPoint);
    }

});

function getInitialData(url) {
    axios.get(url, {
            params: {
                api_key: process.env.omdb_api_key,
                with_genres: chosenGenre.id,
                with_original_language: chosenLanguage.id,
                'vote_average.gte': 6
            }
        })
        .then(function (response) {
            const randomPageNumber = 1 + Math.floor(Math.random()*response.data.total_pages);
            // Making the initial GET call to OMDB API to fetch movies.
            // OMDB only returns 20 results, for which we need to provide a page number.
            // However, without knowing the total number of page numbers, it's not possible to provide a random page number as it may be out of bounds.
            // Thus, we make 2 GET calls to the same end-point. First to get the total number of pages, and the second to get a list of movies from a random page.
            getDataWithRandomPage(url, randomPageNumber);
        })
        .catch(function (error) {
            console.log(error);
        })
        .finally(function () {
            // always executed
        });
}

// Making the actual GET call with the random page number.
function getDataWithRandomPage(url, randomPageNumber) {
    axios.get(url, {
            params: {
                api_key: process.env.omdb_api_key,
                with_genres: chosenGenre.id,
                with_original_language: chosenLanguage.id,
                'vote_average.gte': 6,
                page: randomPageNumber
            }
        })
        .then(function (response) {
            // Selecting a random movie from the 20 results.
            const randomIndex = Math.floor(Math.random()*20);
            if(url===moviesEndPoint) {
                responseTweetContent = 'Title: ' + response.data.results[randomIndex]['title']
                + '\nRelease Date: ' + dateFormat(response.data.results[randomIndex]['release_date'], 'mmmm dd, yyyy');
                getIMDBId('movie',response.data.results[randomIndex]['id']);
            }
            else if (url===showsEndPoint) {
                responseTweetContent = 'Title: ' + response.data.results[randomIndex]['name']
                + '\nRelease Date: ' + dateFormat(response.data.results[randomIndex]['first_air_date'], 'mmmm dd, yyyy');
                getIMDBId('tv',response.data.results[randomIndex]['id']);
            }
            responseTweetContent += '\nAverage Rating: ' + response.data.results[randomIndex]['vote_average'] + '/10';
            if (response.data.results[randomIndex]['poster_path']!=='undefined') {
                imageEndpoint = 'https://image.tmdb.org/t/p/w500'+response.data.results[randomIndex]['poster_path'];
            }
            tweetReply();
        })
        .catch(function (error) {
            console.log(error);
        })
        .finally(function () {
            // always executed
        });
}

function getIMDBId(type, id) {
    const endpoint = 'https://api.themoviedb.org/3/' + type + '/' + id + '/external_ids';
    axios.get(endpoint, {
            params: {
                api_key: process.env.omdb_api_key
            }
        })
        .then(function (response) {
            if(response.data['imdb_id']!=='undefined') {
                responseTweetContent += '\nFind out more at: https://www.imdb.com/title/' + response.data['imdb_id'];
            }
        })
        .catch(function (error) {
            console.log(error);
        })
        .finally(function () {
            // always executed
        });
}

function tweetReply() {
    base64.encode(imageEndpoint, {string: true}, function (error, image) {
            if (error) {
                console.log(error);
            }

            // Upload image to Twitter
            Twitter.post('media/upload', { media_data: image }, function (err, data, response) {
                if(!err) {
                    // now we can assign alt text to the media, for use by screen readers and
                    // other text-based presentations and interpreters
                    const mediaIdStr = data.media_id_string;

                    // The actual response tweeted to the sender.
                    const greeting = greetingsList.find(greeting => greeting['language']===contents[0]);
                    const responseTweet = "@" + username + ' ' + greeting.hello + ' ' + firstName + '! Here\'s a ' + contents[0] + ' ' + contents[2] + ' you can watch in the \'' + contents[1] + '\' genre:\n\n' + responseTweetContent;

                    // We can now reference the media and post a tweet (media will attach to the tweet)
                    const params = {
                        status: responseTweet,
                        media_ids: [mediaIdStr],
                        in_reply_to_status_id: tweetID
                    };

                    // Making the post request to tweet the reply.
                    Twitter.post('statuses/update', params, function(err, data, response) {
                        if (!err) {
                            console.log('Tweeted: ' + params.status);
                        } else {
                            console.log(err);
                        }
                    });
                }
                else {
                    console.log(err);
                }
            });

        }
    );

}