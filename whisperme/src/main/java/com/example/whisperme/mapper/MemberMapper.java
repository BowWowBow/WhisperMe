package com.example.whisperme.mapper;

import com.example.whisperme.domain.Member;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemberMapper {

    void insertMember(Member member);

    Member findByLoginId(String loginId);

    Member findById(@Param("id") Long id);

    void updateNickname(@Param("id") Long id,
                        @Param("nickname") String nickname);

    void updatePassword(@Param("id") Long id,
                        @Param("password") String password);
}