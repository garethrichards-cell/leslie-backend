// Leslie AI Dashboard - Eliza Integration Module
// This file handles the integration between the Leslie Dashboard and the Eliza framework

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class ElizaIntegration {
  constructor(configPath, elizaPath) {
    this.configPath = configPath || path.join(__dirname, 'leslie_config.json');
    this.elizaPath = elizaPath || path.join(__dirname, 'eliza');
    this.elizaProcess = null;
    this.isRunning = false;
    this.characterFilePath = path.join(this.elizaPath, 'leslie_eliza_character.json');
  }

  // Initialize the integration
  async initialize() {
    try {
      // Check if Eliza is installed
      if (!fs.existsSync(this.elizaPath)) {
        console.log('Eliza framework not found. Installing...');
        await this.installEliza();
      }

      // Check if Leslie character file exists
      if (!fs.existsSync(this.characterFilePath)) {
        console.log('Leslie character file not found. Creating...');
        await this.createCharacterFile();
      }

      console.log('Eliza integration initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Eliza integration:', error);
      return false;
    }
  }

  // Install Eliza framework
  async installEliza() {
    return new Promise((resolve, reject) => {
      console.log('Cloning Eliza repository...');
      const gitClone = spawn('git', ['clone', 'https://github.com/elizaOS/eliza.git', this.elizaPath]);

      gitClone.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Git clone exited with code ${code}`));
        }

        console.log('Installing Eliza dependencies...');
        const npmInstall = spawn('npm', ['install'], { cwd: this.elizaPath });

        npmInstall.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error(`npm install exited with code ${code}`));
          }

          console.log('Building Eliza...');
          const npmBuild = spawn('npm', ['run', 'build'], { cwd: this.elizaPath });

          npmBuild.on('close', (code) => {
            if (code !== 0) {
              return reject(new Error(`npm build exited with code ${code}`));
            }

            console.log('Eliza installed successfully');
            resolve();
          });
        });
      });
    });
  }

  // Create Leslie character file from dashboard config
  async createCharacterFile() {
    try {
      // Read dashboard config
      const dashboardConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));

      // Create character file structure
      const characterData = {
        name: "Leslie",
        description: "Your friendly AI guide to exploring the Lake District! Leslie showcases a stylish, traditional slate cottage in Keswick to inspire your next holiday.",
        instructions: "You are Leslie, a friendly AI guide to the Lake District who helps travelers discover the charm of the region while showcasing a stylish 3-bedroom slate cottage in Keswick. You love sharing the joy of returning home after a day's adventure: stepping into the practical boot room, washing off muddy gear, and relaxing in the rolltop bath while watching the sunset paint Skiddaw in golden hues. Always be helpful, informative, engaging, welcoming, and friendly. Respond to questions about the Lake District, Keswick, hiking trails, and local attractions with enthusiasm and knowledge. When promoting the holiday home, focus on its unique features, comfort, and perfect location. Always include the booking link (https://shorturl.at/lpcpl) when recommending the property. Maintain a casual, conversational tone and be respectful in all interactions.",
        clients: ["twitter"],
        twitter_api_key: dashboardConfig.twitter.apiKey,
        twitter_api_key_secret: dashboardConfig.twitter.apiKeySecret,
        twitter_access_token: dashboardConfig.twitter.accessToken,
        twitter_access_token_secret: dashboardConfig.twitter.accessTokenSecret,
        model: "gpt-4",
        temperature: 0.7,
        system_message: "You are Leslie, a friendly AI guide to the Lake District who helps travelers discover the charm of the region while showcasing a stylish 3-bedroom slate cottage in Keswick.",
        auto_reply: true,
        auto_reply_prompt: "As Leslie, respond to this tweet in a friendly, helpful manner. If they're asking about the Lake District, Keswick, or holiday accommodations, provide useful information and mention your 3-bedroom cottage when relevant. Always be polite and respectful, maintaining the Leslie persona as a friendly Lake District guide. Keep responses concise for Twitter.",
        posting_schedule: {
          frequency: dashboardConfig.posting.frequency,
          days: dashboardConfig.posting.days,
          times: dashboardConfig.posting.times,
          timezone: dashboardConfig.posting.timezone
        },
        content_strategy: {}
      };

      // Convert dashboard content strategy to Eliza format
      if (dashboardConfig.contentStrategy) {
        // Map property showcase
        if (dashboardConfig.contentStrategy.propertyShowcase) {
          characterData.content_strategy.property_showcase = {
            weight: dashboardConfig.contentStrategy.propertyShowcase.weight,
            templates: dashboardConfig.contentStrategy.propertyShowcase.templates
          };
        }

        // Map outdoor adventures
        if (dashboardConfig.contentStrategy.outdoorAdventures) {
          characterData.content_strategy.outdoor_adventures = {
            weight: dashboardConfig.contentStrategy.outdoorAdventures.weight,
            templates: dashboardConfig.contentStrategy.outdoorAdventures.templates
          };
        }

        // Map local attractions
        if (dashboardConfig.contentStrategy.localAttractions) {
          characterData.content_strategy.local_attractions = {
            weight: dashboardConfig.contentStrategy.localAttractions.weight,
            templates: dashboardConfig.contentStrategy.localAttractions.templates
          };
        }

        // Map seasonal content
        if (dashboardConfig.contentStrategy.seasonalContent) {
          characterData.content_strategy.seasonal_content = {
            weight: dashboardConfig.contentStrategy.seasonalContent.weight,
            templates: dashboardConfig.contentStrategy.seasonalContent.templates
          };
        }
      }

      // Add hashtags
      characterData.hashtags = dashboardConfig.hashtags || [
        "#LakeDistrict",
        "#Keswick",
        "#KeswickHolidays",
        "#LakeDistrictHolidays",
        "#OutdoorAdventures",
        "#Derwentwater",
        "#Skiddaw",
        "#Catbells",
        "#HikingUK",
        "#CozyCottage",
        "#HolidayHome",
        "#LakeDistrictWalks"
      ];

      // Write character file
      fs.writeFileSync(this.characterFilePath, JSON.stringify(characterData, null, 2));
      console.log('Leslie character file created successfully');
    } catch (error) {
      console.error('Error creating character file:', error);
      throw error;
    }
  }

  // Start Eliza with Leslie character
  async startEliza() {
    try {
      if (this.isRunning) {
        console.log('Eliza is already running');
        return true;
      }

      // Update character file from dashboard config
      await this.createCharacterFile();

      console.log('Starting Eliza with Leslie character...');
      this.elizaProcess = spawn('npm', ['start', '--', '--characters', 'leslie_eliza_character.json'], {
        cwd: this.elizaPath
      });

      this.elizaProcess.stdout.on('data', (data) => {
        console.log(`Eliza stdout: ${data}`);
      });

      this.elizaProcess.stderr.on('data', (data) => {
        console.error(`Eliza stderr: ${data}`);
      });

      this.elizaProcess.on('close', (code) => {
        console.log(`Eliza process exited with code ${code}`);
        this.isRunning = false;
        this.elizaProcess = null;
      });

      this.isRunning = true;
      console.log('Eliza started successfully');
      return true;
    } catch (error) {
      console.error('Error starting Eliza:', error);
      return false;
    }
  }

  // Stop Eliza
  stopEliza() {
    try {
      if (!this.isRunning || !this.elizaProcess) {
        console.log('Eliza is not running');
        return true;
      }

      console.log('Stopping Eliza...');
      this.elizaProcess.kill();
      this.isRunning = false;
      this.elizaProcess = null;
      console.log('Eliza stopped successfully');
      return true;
    } catch (error) {
      console.error('Error stopping Eliza:', error);
      return false;
    }
  }

  // Check if Eliza is running
  isElizaRunning() {
    return this.isRunning;
  }

  // Sync scheduled posts from dashboard to Eliza
  async syncScheduledPosts(scheduledPosts) {
    try {
      // Read character file
      const characterData = JSON.parse(fs.readFileSync(this.characterFilePath, 'utf8'));

      // Update scheduled posts
      characterData.scheduled_posts = scheduledPosts.map(post => ({
        content: post.content,
        scheduled_for: post.scheduledFor,
        type: post.type
      }));

      // Write updated character file
      fs.writeFileSync(this.characterFilePath, JSON.stringify(characterData, null, 2));
      console.log('Scheduled posts synced successfully');
      return true;
    } catch (error) {
      console.error('Error syncing scheduled posts:', error);
      return false;
    }
  }

  // Sync content strategy from dashboard to Eliza
  async syncContentStrategy(contentStrategy) {
    try {
      // Read character file
      const characterData = JSON.parse(fs.readFileSync(this.characterFilePath, 'utf8'));

      // Update content strategy
      if (!characterData.content_strategy) {
        characterData.content_strategy = {};
      }

      // Map property showcase
      if (contentStrategy.propertyShowcase) {
        characterData.content_strategy.property_showcase = {
          weight: contentStrategy.propertyShowcase.weight,
          templates: contentStrategy.propertyShowcase.templates
        };
      }

      // Map outdoor adventures
      if (contentStrategy.outdoorAdventures) {
        characterData.content_strategy.outdoor_adventures = {
          weight: contentStrategy.outdoorAdventures.weight,
          templates: contentStrategy.outdoorAdventures.templates
        };
      }

      // Map local attractions
      if (contentStrategy.localAttractions) {
        characterData.content_strategy.local_attractions = {
          weight: contentStrategy.localAttractions.weight,
          templates: contentStrategy.localAttractions.templates
        };
      }

      // Map seasonal content
      if (contentStrategy.seasonalContent) {
        characterData.content_strategy.seasonal_content = {
          weight: contentStrategy.seasonalContent.weight,
          templates: contentStrategy.seasonalContent.templates
        };
      }

      // Write updated character file
      fs.writeFileSync(this.characterFilePath, JSON.stringify(characterData, null, 2));
      console.log('Content strategy synced successfully');
      return true;
    } catch (error) {
      console.error('Error syncing content strategy:', error);
      return false;
    }
  }

  // Sync posting schedule from dashboard to Eliza
  async syncPostingSchedule(postingSchedule) {
    try {
      // Read character file
      const characterData = JSON.parse(fs.readFileSync(this.characterFilePath, 'utf8'));

      // Update posting schedule
      characterData.posting_schedule = {
        frequency: postingSchedule.frequency,
        days: postingSchedule.days,
        times: postingSchedule.times,
        timezone: postingSchedule.timezone
      };

      // Write updated character file
      fs.writeFileSync(this.characterFilePath, JSON.stringify(characterData, null, 2));
      console.log('Posting schedule synced successfully');
      return true;
    } catch (error) {
      console.error('Error syncing posting schedule:', error);
      return false;
    }
  }

  // Get Eliza logs
  getElizaLogs() {
    try {
      const logPath = path.join(this.elizaPath, 'logs', 'eliza.log');
      if (!fs.existsSync(logPath)) {
        return 'No logs found';
      }

      // Read last 100 lines of log file
      const logContent = fs.readFileSync(logPath, 'utf8');
      const logLines = logContent.split('\n');
      const lastLines = logLines.slice(-100).join('\n');
      return lastLines;
    } catch (error) {
      console.error('Error getting Eliza logs:', error);
      return 'Error retrieving logs';
    }
  }
}

module.exports = ElizaIntegration;
