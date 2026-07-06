package com.example.whisperme.controller;

import com.example.whisperme.domain.ChatMessage;
import com.example.whisperme.service.ChatMessageService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "http://localhost:5173")
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    public ChatMessageController(ChatMessageService chatMessageService) {
        this.chatMessageService = chatMessageService;
    }

    @PostMapping("/user")
    public String saveUserMessage(@RequestBody(required = false) ChatMessage message,
                                  @RequestParam(required = false) Long roomId,
                                  @RequestParam(required = false) String content) {

        Long finalRoomId = message != null && message.getRoomId() != null
                ? message.getRoomId()
                : roomId;

        String finalContent = message != null && message.getContent() != null
                ? message.getContent()
                : content;

        if (finalRoomId == null) {
            return "roomId가 없습니다.";
        }

        if (finalContent == null || finalContent.trim().isEmpty()) {
            return "저장할 사용자 메시지가 없습니다.";
        }

        chatMessageService.saveUserMessage(finalRoomId, finalContent);
        return "사용자 메시지 저장 완료";
    }

    @PostMapping("/assistant")
    public String saveAssistantMessage(@RequestBody(required = false) ChatMessage message,
                                       @RequestParam(required = false) Long roomId,
                                       @RequestParam(required = false) String content) {

        Long finalRoomId = message != null && message.getRoomId() != null
                ? message.getRoomId()
                : roomId;

        String finalContent = message != null && message.getContent() != null
                ? message.getContent()
                : content;

        if (finalRoomId == null) {
            return "roomId가 없습니다.";
        }

        if (finalContent == null || finalContent.trim().isEmpty()) {
            return "저장할 AI 메시지가 없습니다.";
        }

        chatMessageService.saveAssistantMessage(finalRoomId, finalContent);
        return "AI 메시지 저장 완료";
    }

    @PostMapping("/file")
    public String saveFileMessage(@RequestBody ChatMessage message) {
        chatMessageService.saveFileMessage(message);
        return "파일 메시지 저장 완료";
    }

    @GetMapping("/{roomId}")
    public List<ChatMessage> getMessages(@PathVariable Long roomId) {
        return chatMessageService.findByRoomId(roomId);
    }

    @GetMapping("/{roomId}/search")
    public List<ChatMessage> search(@PathVariable Long roomId,
                                    @RequestParam String keyword) {
        return chatMessageService.search(roomId, keyword);
    }

    @DeleteMapping("/{roomId}")
    public String deleteMessages(@PathVariable Long roomId) {
        chatMessageService.deleteByRoomId(roomId);
        return "메시지 삭제 완료";
    }
}
