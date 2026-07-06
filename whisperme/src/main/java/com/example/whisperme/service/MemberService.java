package com.example.whisperme.service;

import com.example.whisperme.domain.Member;
import com.example.whisperme.mapper.MemberMapper;
import org.springframework.stereotype.Service;

@Service
public class MemberService {

    private final MemberMapper memberMapper;

    public MemberService(MemberMapper memberMapper) {
        this.memberMapper = memberMapper;
    }

    public void join(Member member) {
        memberMapper.insertMember(member);
    }

    public Member login(String loginId) {
        return memberMapper.findByLoginId(loginId);
    }

    public Member findById(Long id) {
        return memberMapper.findById(id);
    }

    public Member updateNickname(Long id,
                                 String nickname,
                                 String password,
                                 String passwordConfirm) {

        Member findMember = memberMapper.findById(id);

        if (findMember == null) {
            throw new RuntimeException("회원이 없습니다.");
        }

        if (!password.equals(passwordConfirm)) {
            throw new RuntimeException("비밀번호 재입력이 일치하지 않습니다.");
        }

        if (!findMember.getPassword().equals(password)) {
            throw new RuntimeException("비밀번호가 맞지 않습니다.");
        }

        memberMapper.updateNickname(id, nickname);

        Member updatedMember = memberMapper.findById(id);
        updatedMember.setPassword(null);

        return updatedMember;
    }

    public void changePassword(Long id,
                               String currentPassword,
                               String newPassword,
                               String newPasswordConfirm) {

        Member findMember = memberMapper.findById(id);

        if (findMember == null) {
            throw new RuntimeException("회원이 없습니다.");
        }

        if (!findMember.getPassword().equals(currentPassword)) {
            throw new RuntimeException("현재 비밀번호가 맞지 않습니다.");
        }

        if (!newPassword.equals(newPasswordConfirm)) {
            throw new RuntimeException("새 비밀번호 재입력이 일치하지 않습니다.");
        }

        memberMapper.updatePassword(id, newPassword);
    }
}