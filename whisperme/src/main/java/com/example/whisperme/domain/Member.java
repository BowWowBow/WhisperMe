package com.example.whisperme.domain;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class Member {

    private Long id;

    private String loginId;

    private String password;

    private String nickname;

    private LocalDate birthDate;

    private String region;

    private LocalDateTime createdAt;
}