package com.example.whisperme.domain;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatHistory {

    private Long id;

    private Long memberId;

    private Long roomId;

    private String userMessage;

    private String aiMessage;

    private LocalDateTime createdAt;
}