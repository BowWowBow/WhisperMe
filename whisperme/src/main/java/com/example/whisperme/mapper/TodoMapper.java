package com.example.whisperme.mapper;

import com.example.whisperme.domain.Todo;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface TodoMapper {

    List<Todo> findToday(Long memberId);

    List<Todo> findFuture(Long memberId);

    List<Todo> findPast(Long memberId);

    void insertTodo(Todo todo);

    void updateDone(Long id);

    void deleteTodo(Long id);
}