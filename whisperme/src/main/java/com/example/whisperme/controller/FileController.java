package com.example.whisperme.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "http://localhost:5173")
public class FileController {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @PostMapping("/upload")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) throws Exception {

        File dir = new File(uploadDir);

        if (!dir.exists()) {
            dir.mkdirs();
        }

        String originalName = file.getOriginalFilename();
        String savedName = UUID.randomUUID() + "_" + originalName;

        File saveFile = new File(dir, savedName);
        file.transferTo(saveFile);

        Map<String, String> result = new HashMap<>();
        result.put("fileName", originalName);
        result.put("fileUrl", "/uploads/" + savedName);

        return result;
    }
}