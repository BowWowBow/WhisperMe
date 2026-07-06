package com.example.whisperme.controller;

import com.example.whisperme.domain.ChatRequest;
import com.example.whisperme.service.OpenAIService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final OpenAIService openAIService;

    public AiController(OpenAIService openAIService) {
        this.openAIService = openAIService;
    }

    @PostMapping("/chat")
    public String chat(@RequestBody ChatRequest request) {

        return openAIService.ask(request.getMessage());
    }
}