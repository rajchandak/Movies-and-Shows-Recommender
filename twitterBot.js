const twit = require('twit');
const dotenv = require("dotenv");
const fs = require('fs');
const axios = require('axios');
const lodash = require('lodash');

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
fs.readFile('movieGenres.json', (err, data) => {
    if (err) throw err;
    movieGenresList = JSON.parse(data);
});

// Read and store all supported TV show genres
fs.readFile('showGenres.json', (err, data) => {
    if (err) throw err;
    showGenresList = JSON.parse(data);
});

// Read all languages
fs.readFile('languages.json', (err, data) => {
    if (err) throw err;
    languagesList = JSON.parse(data);
});

// Read all greetings
fs.readFile('greetings.json', (err, data) => {
    if (err) throw err;
    greetingsList = JSON.parse(data);
});

let Twitter = new twit(config);
let stream = Twitter.stream('statuses/filter', { track: '@MoviesShowsBot' });

let username, firstName, tweet, tweetID, contents, chosenGenre, chosenLanguage;

stream.on('tweet', function(eventMsg) {

    // Username of the sender.
    username = eventMsg.user.screen_name;

    // First Name of the sender.
    firstName = eventMsg.user.name.split(' ')[0];

    // The Tweet content.
    tweet = eventMsg.text;

    // Tweet ID to which the response will be sent.
    tweetID  = eventMsg.id_str;

    // Creating an array of the tweet text. contents[0] = genre, contents[1] = language.
    contents = lodash.startCase(lodash.toLower(tweet.substring('@MoviesShowsBot '.length))).split(' ');

    chosenLanguage = languagesList.find(language => language['english_name']===contents[2]);
    if(contents[0]==='Movie') {
        chosenGenre = movieGenresList.find(genre => genre['name']===contents[1]);
        getInitialData(moviesEndPoint);
    }
    else if(contents[0]==='Show') {
        chosenGenre = showGenresList.find(genre => genre['name']===contents[1]);
        getInitialData(showsEndPoint);
    }

});

function getInitialData(url) {
    axios.get(url, {
            params: {
                api_key: process.env.omdb_api_key,
                with_genres: chosenGenre.id,
                with_original_language: chosenLanguage.id
            }
        })
        .then(function (response) {
            const randomPageNumber = Math.floor(Math.random()*response.data.total_pages);
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
                page: randomPageNumber
            }
        })
        .then(function (response) {
            // Selecting a random movie from the 20 results.
            const randomIndex = Math.floor(Math.random()*20);
            if(url===moviesEndPoint) {
                responseTweetContent = response.data.results[randomIndex]['title'];
            }
            else if (url===showsEndPoint) {
                responseTweetContent = response.data.results[randomIndex]['name'];
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

function tweetReply() {
    // The actual response tweeted to the sender.
    const greeting = greetingsList.find(greeting => greeting['language']===contents[2]);
    const responseTweet = "@" + username + ' ' + greeting.hello + ' ' + firstName + '! Here\'s a ' + contents[0] + ' I recommend in the \'' + contents[1] + '\' genre:\n\n' + responseTweetContent;

    // Parameters to be sent with the post request.
    const params = {
        status: responseTweet,
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
