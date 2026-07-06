package com.example.whisperme.domain;

import lombok.Data;

import java.util.List;

@Data
public class MultiImageRequest {

    private String userMessage;

    private List<String> fileUrls;
}