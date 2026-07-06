package com.example.whisperme.mapper;

import com.example.whisperme.domain.ChatHistory;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface ChatMapper {

    void insertChat(ChatHistory chatHistory);

    List<ChatHistory> findByMemberId(Long memberId);

    void deleteChat(Long id);

    void updateChat(ChatHistory chatHistory);
}