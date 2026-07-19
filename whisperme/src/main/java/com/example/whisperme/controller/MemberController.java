package com.example.whisperme.controller;

import com.example.whisperme.domain.Member;
import com.example.whisperme.service.MemberService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/member")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://13.125.217.252:5173",
        "https://whisper.jkyungsoo.com"
})
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping("/join")
    public String join(@RequestBody Member member) {

        if (member.getLoginId() == null || member.getLoginId().trim().isEmpty()) {
            throw new RuntimeException("아이디가 필요합니다.");
        }

        if (member.getPassword() == null || member.getPassword().trim().isEmpty()) {
            throw new RuntimeException("비밀번호가 필요합니다.");
        }

        if (member.getNickname() == null || member.getNickname().trim().isEmpty()) {
            throw new RuntimeException("닉네임이 필요합니다.");
        }

        if (member.getRegion() != null && member.getRegion().trim().isEmpty()) {
            member.setRegion(null);
        }

        memberService.join(member);

        return "회원가입 완료";
    }

    @PostMapping("/login")
    public Member login(@RequestBody Member member) {

        Member findMember = memberService.login(member.getLoginId());

        if (findMember == null) {
            throw new RuntimeException("아이디 없음");
        }

        if (!findMember.getPassword().equals(member.getPassword())) {
            throw new RuntimeException("비밀번호 틀림");
        }

        findMember.setPassword(null);

        return findMember;
    }

    @PutMapping("/{id}")
    public Member updateNickname(@PathVariable Long id,
                                 @RequestBody Map<String, String> body) {

        String nickname = body.get("nickname");
        String password = body.get("password");
        String passwordConfirm = body.get("passwordConfirm");

        if (nickname == null || nickname.trim().isEmpty()) {
            throw new RuntimeException("닉네임이 필요합니다.");
        }

        if (password == null || password.trim().isEmpty()) {
            throw new RuntimeException("비밀번호가 필요합니다.");
        }

        if (passwordConfirm == null || passwordConfirm.trim().isEmpty()) {
            throw new RuntimeException("비밀번호 재입력이 필요합니다.");
        }

        return memberService.updateNickname(
                id,
                nickname.trim(),
                password,
                passwordConfirm
        );
    }

    @PutMapping("/{id}/password")
    public String changePassword(@PathVariable Long id,
                                 @RequestBody Map<String, String> body) {

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        String newPasswordConfirm = body.get("newPasswordConfirm");

        if (currentPassword == null || currentPassword.trim().isEmpty()) {
            throw new RuntimeException("현재 비밀번호가 필요합니다.");
        }

        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new RuntimeException("새 비밀번호가 필요합니다.");
        }

        if (newPasswordConfirm == null || newPasswordConfirm.trim().isEmpty()) {
            throw new RuntimeException("새 비밀번호 재입력이 필요합니다.");
        }

        memberService.changePassword(
                id,
                currentPassword,
                newPassword,
                newPasswordConfirm
        );

        return "비밀번호 변경 완료";
    }

    @GetMapping("/test")
    public String test() {
        return "WhisperMe 정상";
    }
}