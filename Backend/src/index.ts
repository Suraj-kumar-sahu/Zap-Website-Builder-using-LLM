require("dotenv").config();

import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt } from "./prompts";

const anthropic = new Anthropic();

async function main() {
    anthropic.messages.stream({
        messages: [{ role: 'user', content: "Hello" }],
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: getSystemPrompt()
    }).on('text', (text) => {
        console.log(text);
    });
}

main();