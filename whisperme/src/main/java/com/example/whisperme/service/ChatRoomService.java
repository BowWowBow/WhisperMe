package com.example.whisperme.service;

import com.example.whisperme.domain.ChatRoom;
import com.example.whisperme.mapper.ChatRoomMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatRoomService {

    private final ChatRoomMapper chatRoomMapper;

    public ChatRoomService(ChatRoomMapper chatRoomMapper) {
        this.chatRoomMapper = chatRoomMapper;
    }

    public void createRoom(Long memberId, String title) {
        ChatRoom room = new ChatRoom();
        room.setMemberId(memberId);
        room.setTitle(cleanTitle(title));

        chatRoomMapper.insert(room);
    }

    public List<ChatRoom> findByMemberId(Long memberId) {
        return chatRoomMapper.findByMemberId(memberId);
    }

    public ChatRoom findById(Long id) {
        return chatRoomMapper.findById(id);
    }

    public List<ChatRoom> search(Long memberId, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return chatRoomMapper.findByMemberId(memberId);
        }

        return chatRoomMapper.search(memberId, keyword.trim());
    }

    public void updateTitle(Long id, String title) {
        if (id == null) {
            throw new IllegalArgumentException("채팅방 id가 필요합니다.");
        }

        ChatRoom room = new ChatRoom();
        room.setId(id);
        room.setTitle(cleanTitle(title));

        chatRoomMapper.updateTitle(room);
    }

    public void delete(Long id) {
        chatRoomMapper.delete(id);
    }

    private String cleanTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            return "새로운 대화";
        }

        String cleanTitle = title.trim();

        if (cleanTitle.length() > 30) {
            cleanTitle = cleanTitle.substring(0, 30);
        }

        return cleanTitle;
    }
}
