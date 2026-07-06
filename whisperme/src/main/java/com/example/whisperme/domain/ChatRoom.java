package com.example.whisperme.domain;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatRoom {

    private Long id;

    private Long memberId;

    private String title;

    private String deletedYn;

    private LocalDateTime createdAt;
}
