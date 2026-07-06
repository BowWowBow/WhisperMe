package com.example.whisperme.mapper;

import com.example.whisperme.domain.ChatMessage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ChatMessageMapper {

    void insert(ChatMessage chatMessage);

    List<ChatMessage> findByRoomId(Long roomId);

    List<ChatMessage> findRecentTextByRoomId(@Param("roomId") Long roomId,
                                             @Param("limit") int limit);

    List<ChatMessage> search(@Param("roomId") Long roomId,
                             @Param("keyword") String keyword);

    void deleteByRoomId(Long roomId);
}