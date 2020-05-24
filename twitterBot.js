const twit = require('twit');
const dotenv = require("dotenv");

dotenv.config();

const config = {
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token: process.env.access_token,
  access_token_secret: process.env.access_token_secret
};

let Twitter = new twit(config);
let stream = Twitter.stream('statuses/filter', { track: '@MoviesShowsBot' });

stream.on('tweet', function(eventMsg) {
		
	// Username of the sender.
    const username = eventMsg.user.screen_name;
	
    // The Tweet content.
	const tweet = eventMsg.text;
	// Creating an array of the tweet text. contents[0] = genre, contents[1] = language.
	const contents = tweet.substring('@MoviesShowsBot '.length).split(' ');    
	
	// Tweet ID to which the response will be sent.
    const tweetID  = eventMsg.id_str;

    // The actual response tweeted to the sender.
    const response = "@" + username + ' ' + contents[0] + ' ' + contents[1];
	
	// Parameters to be sent with the post request.
	const params = {
				  status: response,
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

});
