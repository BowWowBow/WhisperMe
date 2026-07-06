package com.example.whisperme.domain;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatMessage {

    private Long id;
    private Long roomId;
    private String role;
    private String content;
    private String deletedYn;
    private LocalDateTime createdAt;

    private String messageType;
    private String fileName;
    private String fileUrl;
}