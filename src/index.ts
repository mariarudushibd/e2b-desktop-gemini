import "dotenv/config";
import { Sandbox } from "@e2b/desktop";
import { google } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";

// Gemini 2.0 Flash model with native computer use capabilities
const model = google("gemini-2.0-flash-exp");

// Desktop sandbox instance
let desktop: Sandbox | null = null;

// Define computer use tools for the AI
const computerTools = {
  screenshot: tool({
    description: "Take a screenshot of the current desktop state",
    parameters: z.object({}),
    execute: async () => {
      if (!desktop) throw new Error("Desktop not initialized");
      const screenshot = await desktop.screenshot();
      return {
        type: "image" as const,
        image: screenshot,
        mimeType: "image/png",
      };
    },
  }),

  click: tool({
    description: "Click at specific coordinates on the screen",
    parameters: z.object({
      x: z.number().describe("X coordinate to click"),
      y: z.number().describe("Y coordinate to click"),
      button: z
        .enum(["left", "right", "middle"])
        .optional()
        .default("left")
        .describe("Mouse button to click"),
    }),
    execute: async ({ x, y, button }) => {
      if (!desktop) throw new Error("Desktop not initialized");
      await desktop.click({ x, y, button });
      return { success: true, action: `Clicked ${button} at (${x}, ${y})` };
    },
  }),

  doubleClick: tool({
    description: "Double-click at specific coordinates on the screen",
    parameters: z.object({
      x: z.number().describe("X coordinate to double-click"),
      y: z.number().describe("Y coordinate to double-click"),
    }),
    execute: async ({ x, y }) => {
      if (!desktop) throw new Error("Desktop not initialized");
      await desktop.doubleClick({ x, y });
      return { success: true, action: `Double-clicked at (${x}, ${y})` };
    },
  }),

  type: tool({
    description: "Type text using the keyboard",
    parameters: z.object({
      text: z.string().describe("Text to type"),
    }),
    execute: async ({ text }) => {
      if (!desktop) throw new Error("Desktop not initialized");
      await desktop.write(text);
      return { success: true, action: `Typed: "${text}"` };
    },
  }),

  hotkey: tool({
    description:
      "Press a keyboard shortcut (e.g., 'ctrl+c', 'alt+tab', 'enter')",
    parameters: z.object({
      keys: z
        .string()
        .describe("Keyboard shortcut to press (e.g., 'ctrl+c', 'enter')"),
    }),
    execute: async ({ keys }) => {
      if (!desktop) throw new Error("Desktop not initialized");
      await desktop.hotkey(keys);
      return { success: true, action: `Pressed hotkey: ${keys}` };
    },
  }),

  scroll: tool({
    description: "Scroll at specific coordinates",
    parameters: z.object({
      x: z.number().describe("X coordinate to scroll at"),
      y: z.number().describe("Y coordinate to scroll at"),
      direction: z
        .enum(["up", "down"])
        .describe("Scroll direction"),
      amount: z.number().optional().default(3).describe("Number of scroll steps"),
    }),
    execute: async ({ x, y, direction, amount }) => {
      if (!desktop) throw new Error("Desktop not initialized");
      const scrollAmount = direction === "up" ? -amount : amount;
      await desktop.scroll({ x, y, scrollY: scrollAmount });
      return {
        success: true,
        action: `Scrolled ${direction} ${amount} steps at (${x}, ${y})`,
      };
    },
  }),

  moveMouse: tool({
    description: "Move mouse cursor to specific coordinates",
    parameters: z.object({
      x: z.number().describe("X coordinate to move to"),
      y: z.number().describe("Y coordinate to move to"),
    }),
    execute: async ({ x, y }) => {
      if (!desktop) throw new Error("Desktop not initialized");
      await desktop.moveMouse({ x, y });
      return { success: true, action: `Moved mouse to (${x}, ${y})` };
    },
  }),

  runCommand: tool({
    description: "Run a shell command in the desktop environment",
    parameters: z.object({
      command: z.string().describe("Shell command to execute"),
    }),
    execute: async ({ command }) => {
      if (!desktop) throw new Error("Desktop not initialized");
      const result = await desktop.commands.run(command);
      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      };
    },
  }),

  openUrl: tool({
    description: "Open a URL in the default browser",
    parameters: z.object({
      url: z.string().url().describe("URL to open"),
    }),
    execute: async ({ url }) => {
      if (!desktop) throw new Error("Desktop not initialized");
      await desktop.open(url);
      return { success: true, action: `Opened URL: ${url}` };
    },
  }),
};

async function runComputerUseAgent(task: string) {
  console.log("\n🖥️  Starting E2B Desktop Sandbox...\n");

  // Create desktop sandbox
  desktop = await Sandbox.create({
    resolution: [1920, 1080],
    dpi: 96,
  });

  console.log(`✅ Desktop sandbox created`);
  console.log(`🔗 Stream URL: ${desktop.getStreamUrl()}\n`);
  console.log(`📋 Task: ${task}\n`);
  console.log("─".repeat(50));

  try {
    // Agent loop with Gemini
    let continueLoop = true;
    let iteration = 0;
    const maxIterations = 20;

    while (continueLoop && iteration < maxIterations) {
      iteration++;
      console.log(`\n🔄 Iteration ${iteration}/${maxIterations}`);

      // Take a screenshot for context
      const screenshot = await desktop.screenshot();

      const result = await generateText({
        model,
        tools: computerTools,
        maxSteps: 5,
        messages: [
          {
            role: "system",
            content: `You are a computer use agent that can interact with a Linux desktop environment.
You can see the screen through screenshots and use tools to interact with it.
Be precise with coordinates when clicking. Always take a screenshot after actions to verify results.
Complete the user's task step by step.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: task,
              },
              {
                type: "image",
                image: screenshot,
                mimeType: "image/png",
              },
            ],
          },
        ],
      });

      // Log the response
      console.log(`\n💬 Assistant: ${result.text}`);

      // Log tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          console.log(`   🔧 Tool: ${toolCall.toolName}`);
          console.log(`      Args: ${JSON.stringify(toolCall.args)}`);
        }
      }

      // Check if task is complete (simple heuristic)
      if (
        result.text.toLowerCase().includes("task completed") ||
        result.text.toLowerCase().includes("done") ||
        result.text.toLowerCase().includes("finished")
      ) {
        continueLoop = false;
        console.log("\n✅ Task completed!");
      }

      // Check for finish reason
      if (result.finishReason === "stop" && !result.toolCalls?.length) {
        continueLoop = false;
      }
    }

    if (iteration >= maxIterations) {
      console.log("\n⚠️  Max iterations reached");
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    // Cleanup
    console.log("\n🧹 Cleaning up sandbox...");
    await desktop.kill();
    desktop = null;
    console.log("✅ Sandbox terminated");
  }
}

// Example usage
async function main() {
  const task =
    process.argv[2] ||
    "Open Firefox browser and navigate to https://news.ycombinator.com";

  try {
    await runComputerUseAgent(task);
  } catch (error) {
    console.error("Failed to run agent:", error);
    process.exit(1);
  }
}

main();
