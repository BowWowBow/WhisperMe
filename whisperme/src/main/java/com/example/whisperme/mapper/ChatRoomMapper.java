package com.example.whisperme.mapper;

import com.example.whisperme.domain.ChatRoom;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ChatRoomMapper {

    void insert(ChatRoom chatRoom);

    List<ChatRoom> findByMemberId(@Param("memberId") Long memberId);

    ChatRoom findById(@Param("id") Long id);

    List<ChatRoom> search(@Param("memberId") Long memberId,
                          @Param("keyword") String keyword);

    void updateTitle(ChatRoom chatRoom);

    void delete(@Param("id") Long id);
}
