package com.example.whisperme.domain;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class Todo {
    private Long id;
    private Long memberId;
    private String content;
    private Boolean done;
    private LocalDate todoDate;
    private LocalDateTime createdAt;
}