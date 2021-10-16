require('dotenv').config()
const { ETwitterStreamEvent, TweetStream, TwitterApi, ETwitterApiError } = require('twitter-api-v2');
const Twitter = require('twitter-lite');

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const userClient = new TwitterApi({
	appKey: process.env.TWITTER_CONSUMER_KEY,
	appSecret: process.env.TWITTER_CONSUMER_SECRET,
	accessToken: process.env.ACCESS_TOKEN_KEY,
	accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

class DiapoLinkBot {

    constructor() {
        this.client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
    }

	async initRules(){
		const rules = await this.client.v2.streamRules();

		if (rules.data?.length) {
		  await this.client.v2.updateStreamRules({
		    delete: { ids: rules.data.map(rule => rule.id) },
		  });
		}

		// Add rules
		const addedRules = await this.client.v2.updateStreamRules({
		  add: [
		    { value: '"@diapolink thread" is:reply', tag: 'thread' },
		  ],
		});
	}

	async stream() { 
		const diapolinkUserId = '1437516435463491585'

		await this.initRules()
		try {

			const stream = await client.v2.searchStream({
				'tweet.fields': [ 'conversation_id', 'referenced_tweets'],
				'user.fields': [ 'username' ],
				expansions: ['referenced_tweets.id','author_id'],
			});

			stream.autoReconnect = true;
			stream.autoReconnectRetries = Infinity;	

			const replyThreadText = ({tweet, author}) => `I got it!! You can see @${author.username}'s slideshow here https://diapo.link/thread/${tweet.conversation_id}. Thank you for using DiapoLink`

			stream.on(ETwitterStreamEvent.Data, async (data) => {
				console.log(data)

				const { data: tweet, includes: { users }, matching_rules: rules } = data
				const author = users.find( u => u.id === tweet.author_id )

				const isRT = tweet.referenced_tweets?.some(tweet => tweet.type === 'retweeted') ?? false;
				if ( isRT || tweet.author_id === diapolinkUserId ) {
					return;
				}

				if ( rules.some( rule => rule.tag === 'thread') ) {
					await userClient.v1.reply( replyThreadText({tweet,author}), tweet.id ) 
				}
			});

            stream.on(ETwitterStreamEvent.Error, async (error) => {
                console.log(`Twitter Event:Error: ${JSON.stringify(error)}`);
            });
            stream.on(ETwitterStreamEvent.ReconnectAttempt, async () => {
                console.log(`Twitter Event:ReconnectAttempt`);
            });
            stream.on(ETwitterStreamEvent.Reconnected, async () => {
                console.log(`Twitter Event:Reconnected`);
            });
            stream.on(ETwitterStreamEvent.DataKeepAlive, async () => {
                console.log(`Twitter Event:DataKeepAlive`);
            });
        } catch (error) {
            console.log(error);
        }

	}
}

const bot = new DiapoLinkBot();

(async () => {
    await bot.stream();
})();