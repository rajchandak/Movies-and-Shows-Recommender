const twit = require('twit');
const dotenv = require("dotenv");

dotenv.config();

const config = {
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token: process.env.access_token,
  access_token_secret: process.env.access_token_secret
}

const Twitter = new twit(config);

let deleteTweets = function() {
    let params = {
        screen_name: 'MoviesShowsBot'
    }
    Twitter.get('statuses/user_timeline', params, function(err, data) {
        // if there is no error
        if (!err) {
            // loop through all the returned tweets
			for (let i = 0; i < data.length; i++) {
				let rtId = data[i].id_str;
				// Delete each tweet by ID.
				Twitter.post('statuses/destroy/:id', {
					// setting the id equal to the rtId variable
					id: rtId
					// log response and log error
					}, function(err, response) {
					if (response) {
					  console.log('Deleted Tweet!');
					}
					if (err) {
					  console.log(err);
					}
				});
			}
		}	
        else {
            // catch all log if the get request could not be executed
          console.log('Could not get tweets.');
        }
    });
}

deleteTweets();