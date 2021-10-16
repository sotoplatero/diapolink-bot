require('dotenv').config()
const { ETwitterStreamEvent, TweetStream, TwitterApi, ETwitterApiError } = require('twitter-api-v2');

// const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const client = new TwitterApi({ 
	appKey: process.env.TWITTER_CONSUMER_KEY, 
	appSecret: process.env.TWITTER_CONSUMER_SECRET,
	accessToken: process.env.TWITTER_ACCESS_TOKEN, // oauth token from previous step (link generation)
	accessSecret: process.env.TWITTER_ACCESS_SECRET, // oauth token secret from previous step (link generation)	
});

( async () => {

	const rules = await client.v2.streamRules();
	if (rules.data?.length) {
	  await client.v2.updateStreamRules({
	    delete: { ids: rules.data.map(rule => rule.id) },
	  });
	}

	// Add rules
	const addedRules = await client.v2.updateStreamRules({
	  add: [
	    { value: '@diapolink thread is:reply', tag: 'thread' },
	  ],
	});

	const stream = await client.v2.searchStream({
		'tweet.fields': [ 'conversation_id', 'referenced_tweets'],
		expansions: ['referenced_tweets.id'],
	});

	stream.autoReconnect = true;

	const replyThreadText = (tweet) => `Gracias por utilizar @diapolink. La presentación del hilo puedes verla en http://diapo.link/thread/${tweet.conversation_id}`

	stream.on(ETwitterStreamEvent.Data, async ({data: tweet, matching_rules: rules}) => {
		console.log(tweet)

		// const isRT = tweet.data.referenced_tweets?.some(tweet => tweet.type === 'retweeted') ?? false;
		// if (isRT ) 	return;

		if ( rules.some( rule => rule.tag === 'thread') ) {
			console.log(tweet.conversation_id)
			await client.v1.reply( replyThreadText(tweet), tweet.id ) 
		}
		// Ignore RTs or self-sent tweets

		// Reply to tweet
	});

	stream.on(
	  // Emitted when a Twitter sent a signal to maintain connection active
	  ETwitterStreamEvent.DataKeepAlive,
	  () => console.log('Twitter has a keep-alive packet.'),
	);

	stream.on( 
		ETwitterStreamEvent.ConnectionError,
		err => console.log('Connection error!', err),
	);
	// Enable reconnect feature

	// Be sure to close the stream where you don't want to consume data anymore from it
	// stream.close();

})()
