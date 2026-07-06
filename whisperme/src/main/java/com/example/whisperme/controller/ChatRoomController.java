package com.example.whisperme.controller;

import com.example.whisperme.domain.ChatRoom;
import com.example.whisperme.service.ChatMessageService;
import com.example.whisperme.service.ChatRoomService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chatrooms")
@CrossOrigin(origins = "http://localhost:5173")
public class ChatRoomController {

    private final ChatRoomService chatRoomService;
    private final ChatMessageService chatMessageService;

    public ChatRoomController(ChatRoomService chatRoomService,
                              ChatMessageService chatMessageService) {
        this.chatRoomService = chatRoomService;
        this.chatMessageService = chatMessageService;
    }

    @GetMapping
    public List<ChatRoom> getRooms(@RequestParam Long memberId) {
        return chatRoomService.findByMemberId(memberId);
    }

    @GetMapping("/{id}")
    public ChatRoom getRoom(@PathVariable Long id) {
        return chatRoomService.findById(id);
    }

    @GetMapping("/search")
    public List<ChatRoom> search(@RequestParam Long memberId,
                                 @RequestParam String keyword) {
        return chatRoomService.search(memberId, keyword);
    }

    @PostMapping
    public String createRoom(@RequestBody ChatRoom room) {

        Long memberId = room.getMemberId();
        String title = room.getTitle();

        if (memberId == null) {
            throw new IllegalArgumentException("memberId가 필요합니다.");
        }

        if (title == null || title.trim().isEmpty()) {
            title = "새로운 대화";
        }

        chatRoomService.createRoom(memberId, title);

        return "채팅방 생성 완료";
    }

    @PutMapping("/{id}")
    public String updateRoomTitle(@PathVariable Long id,
                                  @RequestBody Map<String, String> request) {

        String title = request.get("title");

        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("채팅방 제목을 입력해주세요.");
        }

        chatRoomService.updateTitle(id, title);

        return "채팅방 제목 수정 완료";
    }

    @DeleteMapping("/{id}")
    public String deleteRoom(@PathVariable Long id) {
        chatMessageService.deleteByRoomId(id);
        chatRoomService.delete(id);
        return "채팅방 삭제 완료";
    }
}
