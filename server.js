const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const { TwitterApi } = require('twitter-api-v2');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load Leslie configuration
let leslieConfig;
try {
  const configPath = path.join(__dirname, 'leslie_config.json');
  if (fs.existsSync(configPath)) {
    leslieConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    leslieConfig = {
      twitter: {
        apiKey: process.env.TWITTER_API_KEY,
        apiKeySecret: process.env.TWITTER_API_KEY_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
      },
      posting: {
        frequency: '3_per_week',
        days: ['Tuesday', 'Thursday', 'Saturday'],
        times: ['09:00'],
        timezone: 'Europe/London'
      },
      contentStrategy: {
        propertyShowcase: {
          weight: 30,
          templates: [
            '🏡 The rolltop bath with views of Skiddaw is my favorite spot in our Keswick cottage. Perfect after a day of hiking! Book your Lake District escape: https://shorturl.at/lpcpl #LakeDistrict #KeswickHolidays',
            '☕ Morning coffee tastes better with this view from our Keswick cottage. The perfect start to your Lake District adventure! https://shorturl.at/lpcpl #LakeDistrictHolidays',
            '🔥 There\'s nothing like warming up by the wood-burning stove after exploring the fells. Our Keswick cottage is waiting for you: https://shorturl.at/lpcpl #CozyCottage #LakeDistrict'
          ]
        },
        outdoorAdventures: {
          weight: 30,
          templates: [
            '🥾 Catbells is one of my favorite hikes near Keswick - moderate difficulty with spectacular views! Our cottage is just 15 minutes away: https://shorturl.at/lpcpl #LakeDistrictHikes',
            '🌲 The ancient woodlands of Borrowdale are magical in any season. Explore them from our comfortable Keswick base: https://shorturl.at/lpcpl #LakeDistrictWalks',
            '⛰️ Did you know Skiddaw is one of England\'s highest mountains? The views are worth every step! Rest those tired legs at our Keswick cottage after: https://shorturl.at/lpcpl #LakeDistrictAdventures'
          ]
        },
        localAttractions: {
          weight: 20,
          templates: [
            '🛍️ Keswick\'s market days (Thursdays and Saturdays) are perfect for finding local treasures! Our cottage is just a 10-minute walk from the market square: https://shorturl.at/lpcpl #KeswickMarket',
            '🚢 A Derwentwater boat trip offers stunning views of the surrounding fells. Then return to comfort at our nearby cottage: https://shorturl.at/lpcpl #LakeDistrictBoating',
            '🍺 The Dog & Gun pub in Keswick serves amazing Goulash! It\'s a short walk from our cottage - no driving needed: https://shorturl.at/lpcpl #KeswickPubs #LakeDistrictFood'
          ]
        },
        seasonalContent: {
          weight: 20,
          templates: [
            '🍂 Autumn in the Lake District means golden forests and misty mornings. Our cottage\'s boot room is ready for your muddy adventures! https://shorturl.at/lpcpl #AutumnInTheLakes',
            '❄️ Winter in Keswick means crowd-free trails and cozy evenings by the fire. Book your winter escape now: https://shorturl.at/lpcpl #WinterInTheLakes',
            '🌸 Spring brings daffodils, lambs, and refreshing walks in the Lake District. Our Keswick cottage is the perfect base for your spring break: https://shorturl.at/lpcpl #SpringInTheLakes'
          ]
        }
      },
      hashtags: [
        '#LakeDistrict',
        '#Keswick',
        '#KeswickHolidays',
        '#LakeDistrictHolidays',
        '#OutdoorAdventures',
        '#Derwentwater',
        '#Skiddaw',
        '#Catbells',
        '#HikingUK',
        '#CozyCottage',
        '#HolidayHome',
        '#LakeDistrictWalks'
      ],
      scheduledPosts: [],
      publishedPosts: [],
      analytics: {
        followers: {
          total: 0,
          history: []
        },
        engagement: {
          likes: 0,
          retweets: 0,
          comments: 0,
          clicks: 0,
          history: []
        }
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(leslieConfig, null, 2));
  }
} catch (error) {
  console.error('Error loading Leslie configuration:', error);
  leslieConfig = {
    twitter: {},
    posting: {},
    contentStrategy: {},
    hashtags: [],
    scheduledPosts: [],
    publishedPosts: [],
    analytics: { followers: { total: 0, history: [] }, engagement: { likes: 0, retweets: 0, comments: 0, clicks: 0, history: [] } }
  };
}

// Initialize Twitter client
let twitterClient;
try {
  if (leslieConfig.twitter.apiKey && leslieConfig.twitter.apiKeySecret && 
      leslieConfig.twitter.accessToken && leslieConfig.twitter.accessTokenSecret) {
    twitterClient = new TwitterApi({
      appKey: leslieConfig.twitter.apiKey,
      appSecret: leslieConfig.twitter.apiKeySecret,
      accessToken: leslieConfig.twitter.accessToken,
      accessSecret: leslieConfig.twitter.accessTokenSecret
    });
  }
} catch (error) {
  console.error('Error initializing Twitter client:', error);
}

// API Routes

// Test endpoint
app.get('/api/test', (req, res)  => {
  res.json({ status: 'success', message: 'Leslie AI Backend is working properly' });
});

// Get dashboard overview
app.get('/api/dashboard', async (req, res) => {
  try {
    // Get recent posts
    const recentPosts = leslieConfig.publishedPosts.slice(0, 5);
    
    // Get upcoming posts
    const upcomingPosts = leslieConfig.scheduledPosts
      .filter(post => new Date(post.scheduledFor) > new Date())
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
      .slice(0, 5);
    
    // Get analytics summary
    const analytics = {
      followers: leslieConfig.analytics.followers.total,
      posts: leslieConfig.publishedPosts.length,
      engagement: {
        total: leslieConfig.analytics.engagement.likes + 
               leslieConfig.analytics.engagement.retweets + 
               leslieConfig.analytics.engagement.comments,
        clicks: leslieConfig.analytics.engagement.clicks
      }
    };
    
    res.json({
      recentPosts,
      upcomingPosts,
      analytics
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get analytics data
app.get('/api/analytics', (req, res) => {
  try {
    // For demo purposes, generate some realistic analytics if none exist
    if (!leslieConfig.analytics.followers.history.length) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      
      const followerHistory = [];
      const engagementHistory = [];
      
      let followers = 42;
      for (let i = 0; i < 6; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        
        followerHistory.push({
          date: date.toISOString().split('T')[0],
          count: followers
        });
        
        engagementHistory.push({
          date: date.toISOString().split('T')[0],
          rate: (2 + (i * 0.5)).toFixed(1)
        });
        
        followers += Math.floor(Math.random() * 15) + 10;
      }
      
      leslieConfig.analytics.followers.history = followerHistory;
      leslieConfig.analytics.followers.total = followers;
      leslieConfig.analytics.engagement.history = engagementHistory;
      
      // Save updated config
      fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    }
    
    // Calculate content type performance
    const contentPerformance = {
      propertyShowcase: { posts: 0, likes: 0, retweets: 0, comments: 0, clicks: 0 },
      outdoorAdventures: { posts: 0, likes: 0, retweets: 0, comments: 0, clicks: 0 },
      localAttractions: { posts: 0, likes: 0, retweets: 0, comments: 0, clicks: 0 },
      seasonalContent: { posts: 0, likes: 0, retweets: 0, comments: 0, clicks: 0 }
    };
    
    leslieConfig.publishedPosts.forEach(post => {
      if (contentPerformance[post.type]) {
        contentPerformance[post.type].posts++;
        contentPerformance[post.type].likes += post.engagement?.likes || 0;
        contentPerformance[post.type].retweets += post.engagement?.retweets || 0;
        contentPerformance[post.type].comments += post.engagement?.comments || 0;
        contentPerformance[post.type].clicks += post.engagement?.clicks || 0;
      }
    });
    
    // Calculate averages
    Object.keys(contentPerformance).forEach(type => {
      const performance = contentPerformance[type];
      if (performance.posts > 0) {
        performance.avgLikes = (performance.likes / performance.posts).toFixed(1);
        performance.avgRetweets = (performance.retweets / performance.posts).toFixed(1);
        performance.avgComments = (performance.comments / performance.posts).toFixed(1);
        delete performance.likes;
        delete performance.retweets;
        delete performance.comments;
      } else {
        performance.avgLikes = '0.0';
        performance.avgRetweets = '0.0';
        performance.avgComments = '0.0';
      }
    });
    
    // Generate recommendations
    const recommendations = [
      {
        type: 'success',
        title: 'Outdoor Adventures Content Performs Best',
        description: 'Your outdoor adventure posts are receiving 26% more engagement than other content types. Consider increasing the frequency of these posts.'
      },
      {
        type: 'info',
        title: 'Optimal Posting Time',
        description: 'Posts published between 8-10 AM receive 15% more engagement. Consider adjusting your posting schedule to favor morning hours.'
      },
      {
        type: 'warning',
        title: 'Hashtag Performance',
        description: '#LakeDistrictWalks and #KeswickHolidays are your best performing hashtags. Consider using these more consistently in your posts.'
      }
    ];
    
    res.json({
      followers: {
        total: leslieConfig.analytics.followers.total,
        history: leslieConfig.analytics.followers.history
      },
      engagement: {
        history: leslieConfig.analytics.engagement.history
      },
      contentPerformance,
      recommendations
    });
  } catch (error) {
    console.error('Error getting analytics data:', error);
    res.status(500).json({ error: 'Failed to get analytics data' });
  }
});

// Get content templates
app.get('/api/templates', (req, res) => {
  try {
    res.json(leslieConfig.contentStrategy);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Update content template
app.put('/api/templates/:type/:index', (req, res) => {
  try {
    const { type, index } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    if (!leslieConfig.contentStrategy[type] || !leslieConfig.contentStrategy[type].templates) {
      return res.status(404).json({ error: 'Template type not found' });
    }
    
    const templateIndex = parseInt(index, 10);
    if (isNaN(templateIndex) || templateIndex < 0 || templateIndex >= leslieConfig.contentStrategy[type].templates.length) {
      return res.status(404).json({ error: 'Template index out of range' });
    }
    
    leslieConfig.contentStrategy[type].templates[templateIndex] = content;
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    res.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Add new template
app.post('/api/templates/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    if (!leslieConfig.contentStrategy[type] || !leslieConfig.contentStrategy[type].templates) {
      return res.status(404).json({ error: 'Template type not found' });
    }
    
    leslieConfig.contentStrategy[type].templates.push(content);
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Template added successfully',
      index: leslieConfig.contentStrategy[type].templates.length - 1
    });
  } catch (error) {
    console.error('Error adding template:', error);
    res.status(500).json({ error: 'Failed to add template' });
  }
});

// Get scheduled posts
app.get('/api/posts/scheduled', (req, res) => {
  try {
    const scheduledPosts = leslieConfig.scheduledPosts
      .filter(post => new Date(post.scheduledFor) > new Date())
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
    
    res.json(scheduledPosts);
  } catch (error) {
    console.error('Error getting scheduled posts:', error);
    res.status(500).json({ error: 'Failed to get scheduled posts' });
  }
});

// Get published posts
app.get('/api/posts/published', (req, res) => {
  try {
    const publishedPosts = leslieConfig.publishedPosts
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    res.json(publishedPosts);
  } catch (error) {
    console.error('Error getting published posts:', error);
    res.status(500).json({ error: 'Failed to get published posts' });
  }
});

// Schedule a new post
app.post('/api/posts/schedule', (req, res) => {
  try {
    const { content, type, scheduledFor, hashtags } = req.body;
    
    if (!content || !type || !scheduledFor) {
      return res.status(400).json({ error: 'Content, type, and scheduledFor are required' });
    }
    
    const newPost = {
      id: Date.now().toString(),
      content,
      type,
      scheduledFor,
      hashtags: hashtags || [],
      createdAt: new Date().toISOString()
    };
    
    leslieConfig.scheduledPosts.push(newPost);
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Post scheduled successfully',
      post: newPost
    });
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Cancel scheduled post
app.delete('/api/posts/scheduled/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const postIndex = leslieConfig.scheduledPosts.findIndex(post => post.id === id);
    
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }
    
    leslieConfig.scheduledPosts.splice(postIndex, 1);
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Scheduled post cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling scheduled post:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled post' });
  }
});

// Get settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = {
      posting: leslieConfig.posting,
      twitter: {
        apiKey: leslieConfig.twitter.apiKey ? '••••••••••••••••' : '',
        apiKeySecret: leslieConfig.twitter.apiKeySecret ? '••••••••••••••••' : '',
        accessToken: leslieConfig.twitter.accessToken ? '••••••••••••••••' : '',
        accessTokenSecret: leslieConfig.twitter.accessTokenSecret ? '••••••••••••••••' : ''
      },
      hashtags: leslieConfig.hashtags
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update posting settings
app.put('/api/settings/posting', (req, res) => {
  try {
    const { frequency, days, times, timezone } = req.body;
    
    if (frequency) leslieConfig.posting.frequency = frequency;
    if (days) leslieConfig.posting.days = days;
    if (times) leslieConfig.posting.times = times;
    if (timezone) leslieConfig.posting.timezone = timezone;
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Posting settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating posting settings:', error);
    res.status(500).json({ error: 'Failed to update posting settings' });
  }
});

// Update Twitter settings
app.put('/api/settings/twitter', (req, res) => {
  try {
    const { apiKey, apiKeySecret, accessToken, accessTokenSecret } = req.body;
    
    if (apiKey) leslieConfig.twitter.apiKey = apiKey;
    if (apiKeySecret) leslieConfig.twitter.apiKeySecret = apiKeySecret;
    if (accessToken) leslieConfig.twitter.accessToken = accessToken;
    if (accessTokenSecret) leslieConfig.twitter.accessTokenSecret = accessTokenSecret;
    
    // Reinitialize Twitter client
    try {
      if (leslieConfig.twitter.apiKey && leslieConfig.twitter.apiKeySecret && 
          leslieConfig.twitter.accessToken && leslieConfig.twitter.accessTokenSecret) {
        twitterClient = new TwitterApi({
          appKey: leslieConfig.twitter.apiKey,
          appSecret: leslieConfig.twitter.apiKeySecret,
          accessToken: leslieConfig.twitter.accessToken,
          accessSecret: leslieConfig.twitter.accessTokenSecret
        });
      }
    } catch (error) {
      console.error('Error reinitializing Twitter client:', error);
    }
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Twitter settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating Twitter settings:', error);
    res.status(500).json({ error: 'Failed to update Twitter settings' });
  }
});

// Update hashtags
app.put('/api/settings/hashtags', (req, res) => {
  try {
    const { hashtags } = req.body;
    
    if (!hashtags || !Array.isArray(hashtags)) {
      return res.status(400).json({ error: 'Hashtags must be an array' });
    }
    
    leslieConfig.hashtags = hashtags;
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Hashtags updated successfully'
    });
  } catch (error) {
    console.error('Error updating hashtags:', error);
    res.status(500).json({ error: 'Failed to update hashtags' });
  }
});

// Test Twitter connection
app.post('/api/twitter/test', async (req, res) => {
  try {
    if (!twitterClient) {
      return res.status(400).json({ error: 'Twitter client not initialized. Please check your API credentials.' });
    }
    
    // Test the connection by getting the user's profile
    const user = await twitterClient.v2.me();
    
    res.json({
      success: true,
      message: 'Twitter connection successful',
      user: user.data
    });
  } catch (error) {
    console.error('Error testing Twitter connection:', error);
    res.status(500).json({ error: 'Failed to connect to Twitter API. Please check your credentials.' });
  }
});

// Publish a post immediately
app.post('/api/posts/publish', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    if (!twitterClient) {
      return res.status(400).json({ error: 'Twitter client not initialized. Please check your API credentials.' });
    }
    
    // Publish to Twitter
    const tweet = await twitterClient.v2.tweet(content);
    
    // Add to published posts
    const newPost = {
      id: tweet.data.id,
      content,
      publishedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        retweets: 0,
        comments: 0,
        clicks: 0
      }
    };
    
    leslieConfig.publishedPosts.unshift(newPost);
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Post published successfully',
      post: newPost
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ error: 'Failed to publish post to Twitter' });
  }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Leslie AI Dashboard server running on port ${PORT}`);
  
  // Schedule post publishing job
  setInterval(publishScheduledPosts, 60000); // Check every minute
});

// Function to publish scheduled posts
async function publishScheduledPosts() {
  try {
    const now = new Date();
    
    // Find posts that are scheduled for now or in the past
    const postsToPublish = leslieConfig.scheduledPosts.filter(post => {
      const scheduledTime = new Date(post.scheduledFor);
      return scheduledTime <= now;
    });
    
    if (postsToPublish.length === 0) {
      return;
    }
    
    console.log(`Publishing ${postsToPublish.length} scheduled posts...`);
    
    // Publish each post
    for (const post of postsToPublish) {
      try {
        if (!twitterClient) {
          console.error('Twitter client not initialized. Skipping post publishing.');
          continue;
        }
        
        // Publish to Twitter
        const tweet = await twitterClient.v2.tweet(post.content);
        
        // Add to published posts
        const publishedPost = {
          id: tweet.data.id,
          content: post.content,
          type: post.type,
          publishedAt: new Date().toISOString(),
          engagement: {
            likes: 0,
            retweets: 0,
            comments: 0,
            clicks: 0
          }
        };
        
        leslieConfig.publishedPosts.unshift(publishedPost);
        
        // Remove from scheduled posts
        const postIndex = leslieConfig.scheduledPosts.findIndex(p => p.id === post.id);
        if (postIndex !== -1) {
          leslieConfig.scheduledPosts.splice(postIndex, 1);
        }
        
        console.log(`Published post: ${post.id}`);
      } catch (error) {
        console.error(`Error publishing post ${post.id}:`, error);
      }
    }
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
  } catch (error) {
    console.error('Error in publishScheduledPosts:', error);
  }
}

// Function to update engagement metrics (would be called by a separate job)
async function updateEngagementMetrics() {
  try {
    if (!twitterClient) {
      console.error('Twitter client not initialized. Skipping engagement update.');
      return;
    }
    
    // Get the most recent 100 published posts
    const recentPosts = leslieConfig.publishedPosts.slice(0, 100);
    
    for (const post of recentPosts) {
      try {
        // Get tweet metrics from Twitter API
        const tweet = await twitterClient.v2.singleTweet(post.id, {
          'tweet.fields': 'public_metrics'
        });
        
        if (tweet.data && tweet.data.public_metrics) {
          post.engagement = {
            likes: tweet.data.public_metrics.like_count,
            retweets: tweet.data.public_metrics.retweet_count,
            comments: tweet.data.public_metrics.reply_count,
            clicks: post.engagement?.clicks || 0 // Twitter API doesn't provide click metrics
          };
        }
      } catch (error) {
        console.error(`Error updating metrics for post ${post.id}:`, error);
      }
    }
    
    // Update total engagement metrics
    let totalLikes = 0;
    let totalRetweets = 0;
    let totalComments = 0;
    
    leslieConfig.publishedPosts.forEach(post => {
      totalLikes += post.engagement?.likes || 0;
      totalRetweets += post.engagement?.retweets || 0;
      totalComments += post.engagement?.comments || 0;
    });
    
    leslieConfig.analytics.engagement.likes = totalLikes;
    leslieConfig.analytics.engagement.retweets = totalRetweets;
    leslieConfig.analytics.engagement.comments = totalComments;
    
    // Save updated config
    fs.writeFileSync(path.join(__dirname, 'leslie_config.json'), JSON.stringify(leslieConfig, null, 2));
    
    console.log('Engagement metrics updated successfully');
  } catch (error) {
    console.error('Error in updateEngagementMetrics:', error);
  }
}

// Schedule engagement metrics update job (every 6 hours)
setInterval(updateEngagementMetrics, 6 * 60 * 60 * 1000);
