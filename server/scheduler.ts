import { aiService } from "./ai";

export class SchedulerService {
  private intervals: NodeJS.Timeout[] = [];

  start(): void {
    console.log("Starting scheduler service...");

    // Process messages every 30 seconds
    const messageProcessor = setInterval(async () => {
      try {
        await aiService.processUnreadMessages();
      } catch (error) {
        console.error("Error processing messages:", error);
      }
    }, 30000);

    // Generate daily summary every hour (check if needed)
    const summaryGenerator = setInterval(async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const existingSummary = await require("./storage").storage.getDailySummary(today);
        
        if (!existingSummary) {
          await aiService.generateDailySummary(today);
        }
      } catch (error) {
        console.error("Error generating daily summary:", error);
      }
    }, 3600000); // Every hour

    // Generate AI insights every 10 minutes
    const insightGenerator = setInterval(async () => {
      try {
        await aiService.generateAIInsights();
      } catch (error) {
        console.error("Error generating AI insights:", error);
      }
    }, 600000); // Every 10 minutes

    this.intervals.push(messageProcessor, summaryGenerator, insightGenerator);
  }

  stop(): void {
    console.log("Stopping scheduler service...");
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }
}

export const schedulerService = new SchedulerService();
