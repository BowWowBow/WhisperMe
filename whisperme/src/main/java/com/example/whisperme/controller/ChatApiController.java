package com.example.whisperme.controller;

import com.example.whisperme.domain.ChatMessage;
import com.example.whisperme.domain.ChatRoom;
import com.example.whisperme.service.ChatMessageService;
import com.example.whisperme.service.ChatRoomService;
import com.example.whisperme.service.OpenAIService;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin
public class ChatApiController {

    private final OpenAIService openAIService;
    private final ChatMessageService chatMessageService;
    private final ChatRoomService chatRoomService;

    public ChatApiController(OpenAIService openAIService,
                             ChatMessageService chatMessageService,
                             ChatRoomService chatRoomService) {
        this.openAIService = openAIService;
        this.chatMessageService = chatMessageService;
        this.chatRoomService = chatRoomService;
    }

    @PostMapping("/send")
    public String sendMessage(@RequestParam Long roomId,
                              @RequestParam String message) {

        List<ChatMessage> beforeMessages =
                chatMessageService.findByRoomId(roomId);

        if (beforeMessages.isEmpty()) {
            chatRoomService.updateTitle(roomId, message);
        }

        chatMessageService.saveUserMessage(roomId, message);

        List<ChatMessage> messages =
                chatMessageService.findByRoomId(roomId);

        String answer = openAIService.askWithHistory(messages);

        chatMessageService.saveAssistantMessage(roomId, answer);

        return answer;
    }

    @PostMapping("/ask-image")
    public Map<String, String> askImage(@RequestBody Map<String, String> request) {
        String message = request.get("userMessage");
        String fileUrl = request.get("fileUrl");

        String aiMessage = openAIService.askWithImage(message, fileUrl);

        Map<String, String> result = new HashMap<>();
        result.put("aiMessage", aiMessage);

        return result;
    }
}